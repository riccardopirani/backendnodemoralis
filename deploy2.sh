#!/bin/bash
set -e

AWS_REGION="eu-south-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
IMAGE_NAME="jetcvnft-api"
IMAGE_TAG="latest"
SECURITY_GROUP_NAME="jetcvnft-sg"
KEY_PAIR_NAME="jetcvnft-key"
INSTANCE_NAME="jetcvnft-instance"

echo "🚀 Avvio deploy su EC2..."

# 1️⃣ Crea Security Group se non esiste
SG_ID=$(aws ec2 describe-security-groups \
  --filters Name=group-name,Values=$SECURITY_GROUP_NAME \
  --region $AWS_REGION \
  --query "SecurityGroups[0].GroupId" --output text 2>/dev/null || echo "none")

if [ "$SG_ID" == "none" ]; then
  echo "🔐 Creazione Security Group..."
  SG_ID=$(aws ec2 create-security-group \
    --group-name $SECURITY_GROUP_NAME \
    --description "Security group for JetCV API" \
    --region $AWS_REGION \
    --query 'GroupId' --output text)

  # Apri porta 22 (SSH) e 4000 (API)
  aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 22 --cidr 0.0.0.0/0 --region $AWS_REGION
  aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 4000 --cidr 0.0.0.0/0 --region $AWS_REGION
fi

# 2️⃣ Crea chiave SSH se non esiste
if [ ! -f "$KEY_PAIR_NAME.pem" ]; then
  echo "🔑 Creazione chiave SSH..."
  aws ec2 create-key-pair \
    --key-name $KEY_PAIR_NAME \
    --query 'KeyMaterial' \
    --output text > $KEY_PAIR_NAME.pem
  chmod 400 $KEY_PAIR_NAME.pem
fi

# 3️⃣ Avvia istanza EC2
AMI_ID=$(aws ec2 describe-images \
  --owners amazon \
  --filters "Name=name,Values=al2023-ami-*" "Name=architecture,Values=x86_64" \
  --region $AWS_REGION \
  --query 'Images[0].ImageId' --output text)

INSTANCE_ID=$(aws ec2 run-instances \
  --image-id $AMI_ID \
  --count 1 \
  --instance-type t3.micro \
  --key-name $KEY_PAIR_NAME \
  --security-group-ids $SG_ID \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$INSTANCE_NAME}]" \
  --region $AWS_REGION \
  --query 'Instances[0].InstanceId' \
  --output text)

echo "⏳ Attendo che l'istanza EC2 sia in stato 'running'..."
aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $AWS_REGION

# 4️⃣ Recupera IP pubblico
PUBLIC_IP=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --region $AWS_REGION \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

echo "✅ Istanza avviata con IP pubblico: $PUBLIC_IP"

# 5️⃣ Installazione Docker e deploy container
echo "🐳 Installazione Docker e deploy container..."
ssh -o StrictHostKeyChecking=no -i $KEY_PAIR_NAME.pem ec2-user@$PUBLIC_IP <<EOF
sudo yum update -y
sudo yum install -y docker
sudo systemctl enable docker
sudo systemctl start docker

aws ecr get-login-password --region $AWS_REGION | sudo docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
sudo docker pull $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$IMAGE_NAME:$IMAGE_TAG
sudo docker run -d -p 4000:4000 --name jetcvnft-api $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$IMAGE_NAME:$IMAGE_TAG
EOF

echo "🌍 Backend accessibile su: http://$PUBLIC_IP:4000"