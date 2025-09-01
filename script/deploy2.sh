#!/bin/bash
set -e

AWS_REGION="eu-south-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
IMAGE_NAME="jetcvnft-api2"
IMAGE_TAG="latest"
REPO_URI="$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$IMAGE_NAME:$IMAGE_TAG"
SECURITY_GROUP_NAME="jetcvnft-sg"
KEY_PAIR_NAME="jetcvnft-key"
INSTANCE_NAME="jetcvnft-instance"
IAM_ROLE_NAME="EC2ECRAccessRole"
INSTANCE_PROFILE_NAME="EC2ECRProfile"

echo "🚀 Deploy completo su EC2 con eliminazione vecchie istanze..."

# 1️⃣ Elimina tutte le vecchie istanze EC2
OLD_INSTANCES=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=$INSTANCE_NAME" \
  --region $AWS_REGION \
  --query 'Reservations[*].Instances[*].InstanceId' \
  --output text)
echo "🚀 Avvio deploy completo su EC2..."

# 1️⃣ Termina vecchie istanze
OLD_INSTANCES=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=$INSTANCE_NAME" "Name=instance-state-name,Values=running" \
  --region $AWS_REGION \
  --query 'Reservations[*].Instances[*].InstanceId' \
  --output text)

if [ ! -z "$OLD_INSTANCES" ]; then
  echo "🛑 Terminazione vecchie istanze: $OLD_INSTANCES"
  aws ec2 terminate-instances --instance-ids $OLD_INSTANCES --region $AWS_REGION
  aws ec2 wait instance-terminated --instance-ids $OLD_INSTANCES --region $AWS_REGION
fi

# 2️⃣ Verifica o crea repository ECR
if ! aws ecr describe-repositories --repository-names $IMAGE_NAME --region $AWS_REGION >/dev/null 2>&1; then
  echo "📦 Creazione repository ECR..."
  aws ecr create-repository --repository-name $IMAGE_NAME --region $AWS_REGION
else
  echo "✅ Repository ECR esistente"
fi

# 3️⃣ Build e push immagine Docker
echo "🐳 Build e push immagine Docker..."
docker build -t $IMAGE_NAME .
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
docker tag $IMAGE_NAME:$IMAGE_TAG $REPO_URI
docker push $REPO_URI

# 4️⃣ Verifica/crea IAM Role
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

# 5️⃣ Verifica/crea Instance Profile
if ! aws iam get-instance-profile --instance-profile-name $INSTANCE_PROFILE_NAME >/dev/null 2>&1; then
  echo "🔗 Creazione Instance Profile..."
  aws iam create-instance-profile --instance-profile-name $INSTANCE_PROFILE_NAME
  aws iam add-role-to-instance-profile \
    --instance-profile-name $INSTANCE_PROFILE_NAME \
    --role-name $IAM_ROLE_NAME
fi

# 6️⃣ Verifica/crea Security Group
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

# 7️⃣ Verifica chiave SSH
if aws ec2 describe-key-pairs --key-names $KEY_PAIR_NAME --region $AWS_REGION >/dev/null 2>&1; then
  echo "✅ Chiave SSH esistente in AWS: $KEY_PAIR_NAME"
  if [ ! -f "$KEY_PAIR_NAME.pem" ]; then
    echo "⚠️ File PEM non trovato localmente. Devi usare quello originale oppure eliminarla e ricrearla."
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

# 8️⃣ Trova AMI Amazon Linux
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

# 9️⃣ Avvia nuova istanza EC2
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

aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $AWS_REGION

# 🔟 Assegna Elastic IP
ALLOC_ID=$(aws ec2 allocate-address --region $AWS_REGION --query 'AllocationId' --output text)
aws ec2 associate-address --instance-id $INSTANCE_ID --allocation-id $ALLOC_ID --region $AWS_REGION
PUBLIC_IP=$(aws ec2 describe-addresses --allocation-ids $ALLOC_ID --region $AWS_REGION --query 'Addresses[0].PublicIp' --output text)

echo "✅ Istanza avviata con IP statico: $PUBLIC_IP"

# 1️⃣1️⃣ Installazione Docker e deploy container
ssh -o StrictHostKeyChecking=no -i $KEY_PAIR_NAME.pem ec2-user@$PUBLIC_IP <<EOF
sudo yum update -y
sudo yum install -y docker
sudo systemctl enable docker
sudo systemctl start docker

# Grazie all'IAM Role non serve login
sudo docker pull $REPO_URI
sudo docker rm -f jetcvnft-api 2>/dev/null || true
sudo docker run -d -p 4000:4000 --restart always --name jetcvnft-api $REPO_URI
EOF

echo "🌍 Backend disponibile su: http://$PUBLIC_IP:4000"