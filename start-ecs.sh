#!/bin/bash
set -e

# === CONFIGURAZIONI ===
AWS_REGION="eu-south-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPO_NAME="jetcvnft-api"
CLUSTER_NAME="jetcvnft-cluster"
SERVICE_NAME="jetcvnft-service"
TASK_FAMILY="jetcvnft-api-task"
CONTAINER_NAME="jetcvnft-api"
IMAGE_TAG="latest"
ROLE_NAME="ecsTaskExecutionRole"
ALB_NAME="jetcvnft-alb"
TARGET_GROUP_NAME="jetcvnft-tg"
LISTENER_PORT=4000

echo "🚀 Deploy ECS con ALB pubblico"

# === 1. CREA ECR REPO ===
if ! aws ecr describe-repositories --repository-names $ECR_REPO_NAME --region $AWS_REGION >/dev/null 2>&1; then
  echo "📦 Creazione repository ECR..."
  aws ecr create-repository \
    --repository-name $ECR_REPO_NAME \
    --image-scanning-configuration scanOnPush=true \
    --region $AWS_REGION
fi

# === 2. LOGIN ECR ===
aws ecr get-login-password --region $AWS_REGION | \
docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# === 3. BUILD E PUSH IMMAGINE ===
docker build -t $ECR_REPO_NAME .
docker tag $ECR_REPO_NAME:$IMAGE_TAG $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME:$IMAGE_TAG
docker push $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME:$IMAGE_TAG

# === 4. CREA CLUSTER ECS ===
if ! aws ecs describe-clusters --clusters $CLUSTER_NAME --region $AWS_REGION | grep -q "ACTIVE"; then
  aws ecs create-cluster --cluster-name $CLUSTER_NAME --region $AWS_REGION
fi

# === 5. CREA IAM ROLE SE NON ESISTE ===
if ! aws iam get-role --role-name $ROLE_NAME >/dev/null 2>&1; then
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
fi
EXEC_ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query "Role.Arn" --output text)

# === 6. TASK DEFINITION ===
cat > task-definition.json <<EOF
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
        { "containerPort": 4000, "protocol": "tcp" }
      ],
      "essential": true
    }
  ]
}
EOF
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json \
  --region $AWS_REGION

# === 7. RECUPERA SUBNET PUBBLICHE & SECURITY GROUP DEFAULT ===
SUBNETS=$(aws ec2 describe-subnets \
  --filters "Name=default-for-az,Values=true" \
  --query "Subnets[*].SubnetId" \
  --output text \
  --region $AWS_REGION | tr '\t' ',')

SECURITY_GROUP=$(aws ec2 describe-security-groups \
  --filters Name=group-name,Values=default \
  --query "SecurityGroups[0].GroupId" \
  --output text \
  --region $AWS_REGION)

# === 8. CREA ALB SE NON ESISTE ===
ALB_ARN=$(aws elbv2 describe-load-balancers --names $ALB_NAME --region $AWS_REGION --query "LoadBalancers[0].LoadBalancerArn" --output text 2>/dev/null || echo "none")
if [ "$ALB_ARN" == "none" ]; then
  echo "🌐 Creazione Application Load Balancer..."
  ALB_ARN=$(aws elbv2 create-load-balancer \
    --name $ALB_NAME \
    --subnets $(echo $SUBNETS | tr ',' ' ') \
    --security-groups $SECURITY_GROUP \
    --scheme internet-facing \
    --type application \
    --region $AWS_REGION \
    --query "LoadBalancers[0].LoadBalancerArn" \
    --output text)
fi

# === 9. CREA TARGET GROUP SE NON ESISTE ===
TG_ARN=$(aws elbv2 describe-target-groups --names $TARGET_GROUP_NAME --region $AWS_REGION --query "TargetGroups[0].TargetGroupArn" --output text 2>/dev/null || echo "none")
if [ "$TG_ARN" == "none" ]; then
  echo "🎯 Creazione Target Group..."
  VPC_ID=$(aws ec2 describe-security-groups --group-ids $SECURITY_GROUP --region $AWS_REGION --query "SecurityGroups[0].VpcId" --output text)
  TG_ARN=$(aws elbv2 create-target-group \
    --name $TARGET_GROUP_NAME \
    --protocol HTTP \
    --port 4000 \
    --vpc-id $VPC_ID \
    --target-type ip \
    --region $AWS_REGION \
    --query "TargetGroups[0].TargetGroupArn" \
    --output text)
fi

# === 10. CREA LISTENER SE NON ESISTE ===
LISTENER_ARN=$(aws elbv2 describe-listeners --load-balancer-arn $ALB_ARN --region $AWS_REGION --query "Listeners[0].ListenerArn" --output text 2>/dev/null || echo "none")
if [ "$LISTENER_ARN" == "none" ]; then
  echo "🔊 Creazione Listener..."
  LISTENER_ARN=$(aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTP \
    --port $LISTENER_PORT \
    --default-actions Type=forward,TargetGroupArn=$TG_ARN \
    --region $AWS_REGION \
    --query "Listeners[0].ListenerArn" \
    --output text)
fi

# === 11. CREA O AGGIORNA SERVIZIO ECS ===
SERVICE_EXISTS=$(aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $AWS_REGION --query "services[0].status" --output text)
if [ "$SERVICE_EXISTS" == "ACTIVE" ]; then
  echo "♻️ Aggiornamento servizio ECS..."
  aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service $SERVICE_NAME \
    --task-definition $TASK_FAMILY \
    --force-new-deployment \
    --region $AWS_REGION
else
  echo "📦 Creazione nuovo servizio ECS..."
  aws ecs create-service \
    --cluster $CLUSTER_NAME \
    --service-name $SERVICE_NAME \
    --task-definition $TASK_FAMILY \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[$SECURITY_GROUP],assignPublicIp=ENABLED}" \
    --load-balancers "targetGroupArn=$TG_ARN,containerName=$CONTAINER_NAME,containerPort=4000" \
    --region $AWS_REGION
fi

# === 12. RECUPERA URL PUBBLICO ===
ALB_DNS=$(aws elbv2 describe-load-balancers --names $ALB_NAME --region $AWS_REGION --query "LoadBalancers[0].DNSName" --output text)
echo "✅ Deploy completato! Backend accessibile su: http://$ALB_DNS:4000"