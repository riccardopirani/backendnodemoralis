#!/bin/bash
set -e

### VARIABILI
AWS_REGION="eu-south-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPO_NAME="jetcvnft-api"
CLUSTER_NAME="jetcvnft-cluster"
SERVICE_NAME="jetcvnft-service"
TASK_FAMILY="jetcvnft-api-task"
CONTAINER_NAME="jetcvnft-api"
IMAGE_TAG="latest"

### 1. Recupero automatico Subnet ID (prime 2 subnet pubbliche disponibili)
echo "🔎 Recupero subnet disponibili..."
SUBNET_IDS=$(aws ec2 describe-subnets \
  --filters "Name=default-for-az,Values=true" \
  --query "Subnets[*].SubnetId" \
  --output text \
  --region $AWS_REGION | awk '{print $1","$2}')

SUBNET_1=$(echo $SUBNET_IDS | cut -d',' -f1)
SUBNET_2=$(echo $SUBNET_IDS | cut -d',' -f2)

echo "✅ Subnet trovate: $SUBNET_1, $SUBNET_2"

### 2. Recupero automatico Security Group (default)
SECURITY_GROUP=$(aws ec2 describe-security-groups \
  --filters Name=group-name,Values=default \
  --query "SecurityGroups[0].GroupId" \
  --output text \
  --region $AWS_REGION)

echo "✅ Security Group trovato: $SECURITY_GROUP"

### 3. CREA REPOSITORY ECR SE NON ESISTE
echo "🔎 Checking ECR repository..."
if ! aws ecr describe-repositories --repository-names $ECR_REPO_NAME --region $AWS_REGION >/dev/null 2>&1; then
  echo "📦 Repository non trovato, creazione in corso..."
  aws ecr create-repository \
    --repository-name $ECR_REPO_NAME \
    --image-scanning-configuration scanOnPush=true \
    --region $AWS_REGION
else
  echo "✅ Repository ECR già esistente"
fi

### 4. LOGIN ECR
echo "🔑 Login a ECR..."
aws ecr get-login-password --region $AWS_REGION | \
docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

### 5. BUILD, TAG, PUSH DOCKER IMAGE
echo "🚀 Build dell'immagine Docker..."
docker build -t $ECR_REPO_NAME .
docker tag $ECR_REPO_NAME:$IMAGE_TAG $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME:$IMAGE_TAG
docker push $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME:$IMAGE_TAG

### 6. CREA CLUSTER SE NON ESISTE
echo "🔎 Checking ECS Cluster..."
if ! aws ecs describe-clusters --clusters $CLUSTER_NAME --region $AWS_REGION | grep -q "ACTIVE"; then
  echo "📦 Creazione ECS Cluster..."
  aws ecs create-cluster \
    --cluster-name $CLUSTER_NAME \
    --region $AWS_REGION
else
  echo "✅ ECS Cluster già esistente"
fi

### 7. CREA RUOLO IAM SE NON ESISTE
ROLE_NAME="ecsTaskExecutionRole"
if ! aws iam get-role --role-name $ROLE_NAME >/dev/null 2>&1; then
  echo "🔑 Creazione ruolo IAM per ECS..."
  aws iam create-role \
    --role-name $ROLE_NAME \
    --assume-role-policy-document file://<(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "ecs-tasks.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
)
  aws iam attach-role-policy \
    --role-name $ROLE_NAME \
    --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
else
  echo "✅ Ruolo IAM già esistente"
fi

EXEC_ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query "Role.Arn" --output text)

### 8. CREA O AGGIORNA TASK DEFINITION
echo "📝 Creazione nuova Task Definition..."
TASK_DEFINITION_JSON=$(cat <<EOF
{
  "family": "$TASK_FAMILY",
  "executionRoleArn": "$EXEC_ROLE_ARN",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "$CONTAINER_NAME",
      "image": "$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME:$IMAGE_TAG",
      "portMappings": [
        {
          "containerPort": 4000,
          "protocol": "tcp"
        }
      ],
      "essential": true
    }
  ]
}
EOF
)

echo "$TASK_DEFINITION_JSON" > task-definition.json
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json \
  --region $AWS_REGION

### 9. CREA O AGGIORNA SERVIZIO ECS
echo "🔎 Checking ECS Service..."
if ! aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $AWS_REGION | grep -q "ACTIVE"; then
  echo "📦 Creazione nuovo Service ECS..."
  aws ecs create-service \
    --cluster $CLUSTER_NAME \
    --service-name $SERVICE_NAME \
    --task-definition $TASK_FAMILY \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_1,$SUBNET_2],securityGroups=[$SECURITY_GROUP],assignPublicIp=ENABLED}" \
    --region $AWS_REGION
else
  echo "♻️ Aggiornamento Service ECS..."
  aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service $SERVICE_NAME \
    --task-definition $TASK_FAMILY \
    --force-new-deployment \
    --region $AWS_REGION
fi

echo "✅ Deploy completato con successo!"