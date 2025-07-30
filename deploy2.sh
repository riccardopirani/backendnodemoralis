#!/bin/bash
set -e

AWS_REGION="eu-south-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
IMAGE_NAME="jetcvnft-api2"
IMAGE_TAG="latest"
SECURITY_GROUP_NAME="jetcvnft-sg"
KEY_PAIR_NAME="jetcvnft-key"
INSTANCE_NAME="jetcvnft-instance"
IAM_ROLE_NAME="EC2ECRAccessRole"
INSTANCE_PROFILE_NAME="EC2ECRProfile"

echo "🚀 Avvio deploy su EC2 con accesso IAM a ECR..."

# 1️⃣ Verifica o crea IAM Role
if ! aws iam get-role --role-name $IAM_ROLE_NAME >/dev/null 2>&1; then
  echo "🔑 Creazione IAM Role per EC2..."
  aws iam create-role \
    --role-name $IAM_ROLE_NAME \
    --assume-role-policy-document '{
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Principal": { "Service": "ec2.amazonaws.com" },
          "Action": "sts:AssumeRole"
        }
      ]
    }'
  aws iam attach-role-policy \
    --role-name $IAM_ROLE_NAME \
    --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly
fi

# 2️⃣ Crea o associa Instance Profile
if ! aws iam get-instance-profile --instance-profile-name $INSTANCE_PROFILE_NAME >/dev/null 2>&1; then
  echo "🔗 Creazione Instance Profile..."
  aws iam create-instance-profile --instance-profile-name $INSTANCE_PROFILE_NAME
  aws iam add-role-to-instance-profile \
    --instance-profile-name $INSTANCE_PROFILE_NAME \
    --role-name $IAM_ROLE_NAME
fi

# 3️⃣ Verifica o crea Security Group
SG_ID=$(aws ec2 describe-security-groups \
  --filters Name=group-name,Values=$SECURITY_GROUP_NAME \
  --region $AWS_REGION \
  --query "SecurityGroups[0].GroupId" \
  --output text 2>/dev/null)

if [[ -z "$SG_ID" || "$SG_ID" == "None" ]]; then
  echo "🔐 Creazione Security Group..."
  SG_ID=$(aws ec2 create-security-group \
    --group-name $SECURITY_GROUP_NAME \
    --description "Security group for JetCV API" \
    --region $AWS_REGION \
    --query 'GroupId' --output text)
  aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 22 --cidr 0.0.0.0/0 --region $AWS_REGION
  aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 4000 --cidr 0.0.0.0/0 --region $AWS_REGION
else
  echo "✅ Security Group esistente: $SG_ID"
fi

# 4️⃣ Verifica chiave SSH
if aws ec2 describe-key-pairs --key-names $KEY_PAIR_NAME --region $AWS_REGION >/dev/null 2>&1; then
  echo "✅ Chiave SSH esistente in AWS: $KEY_PAIR_NAME"
  if [ ! -f "$KEY_PAIR_NAME.pem" ]; then
    echo "⚠️ File PEM non trovato localmente. Devi usare quello originale oppure eliminare la chiave e ricrearla."
    exit 1
  fi
else
  echo "🔑 Creazione nuova chiave SSH..."
  aws ec2 create-key-pair \
    --key-name $KEY_PAIR_NAME \
    --query 'KeyMaterial' \
    --output text > $KEY_PAIR_NAME.pem
  chmod 400 $KEY_PAIR_NAME.pem
fi

# 5️⃣ Trova AMI Amazon Linux
AMI_ID=$(aws ec2 describe-images \
  --owners amazon \
  --filters "Name=name,Values=al2023-ami-*" "Name=architecture,Values=x86_64" \
  --region $AWS_REGION \
  --query 'Images[0].ImageId' \
  --output text)

if [[ -z "$AMI_ID" || "$AMI_ID" == "None" ]]; then
  echo "❌ Nessuna AMI trovata"
  exit 1
fi

# 6️⃣ Avvia EC2 con IAM Profile
echo "🚀 Avvio nuova istanza EC2..."
INSTANCE_ID=$(aws ec2 run-instances \
  --image-id $AMI_ID \
  --count 1 \
  --instance-type t3.micro \
  --key-name $KEY_PAIR_NAME \
  --security-group-ids $SG_ID \
  --iam-instance-profile Name=$INSTANCE_PROFILE_NAME \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$INSTANCE_NAME}]" \
  --region $AWS_REGION \
  --query 'Instances[0].InstanceId' \
  --output text)

echo "⏳ Attesa che l'istanza sia in esecuzione..."
aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $AWS_REGION

# 7️⃣ Recupera IP pubblico
PUBLIC_IP=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --region $AWS_REGION \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

echo "✅ Istanza avviata con IP pubblico: $PUBLIC_IP"

# 8️⃣ Installazione Docker e deploy container
echo "🐳 Installazione Docker e deploy container..."
ssh -o StrictHostKeyChecking=no -i $KEY_PAIR_NAME.pem ec2-user@$PUBLIC_IP <<EOF
sudo yum update -y
sudo yum install -y docker
sudo systemctl enable docker
sudo systemctl start docker

# Non serve aws ecr login perché l'istanza ha IAM Role
sudo docker pull $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$IMAGE_NAME:$IMAGE_TAG

# Rimuove container precedente se esiste
sudo docker rm -f jetcvnft-api 2>/dev/null || true

sudo docker run -d -p 4000:4000 --restart always --name jetcvnft-api \
  $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$IMAGE_NAME:$IMAGE_TAG
EOF

echo "🌍 Backend disponibile su: http://$PUBLIC_IP:4000"