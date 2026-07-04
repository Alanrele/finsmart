# FinSmart - Deployment to Production (Azure)

## 🚀 Deployment Guide

This guide walks you through deploying FinSmart PWA to Azure Container Apps using Azure Developer CLI (azd).

### Prerequisites

1. **Azure CLI** - [Install Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
2. **Azure Developer CLI** - [Install azd](https://docs.microsoft.com/en-us/azure/developer/azure-developer-cli/install-azd)
3. **Docker** - [Install Docker](https://docs.docker.com/get-docker/)
4. **Azure Subscription** with appropriate permissions

### 🔧 Pre-deployment Setup

1. **Clone and prepare the repository:**
   ```bash
   git clone <your-repo-url>
   cd PAIR-BCP
   ```

2. **Login to Azure:**
   ```bash
   az login
   azd auth login
   ```

3. **Set environment variables:**
   ```bash
   azd env new production
   azd env set AZURE_LOCATION "East US"
   ```

### 🏗️ Infrastructure Deployment

1. **Deploy infrastructure and application:**
   ```bash
   azd up
   ```

2. **Follow the prompts:**
   - Choose your Azure subscription
   - Select a location (e.g., East US)
   - Confirm deployment

### 🔐 Post-deployment Configuration

After deployment, you need to configure secrets and environment variables:

1. **Run the setup script:**
   ```powershell
   .\scripts\setup-production.ps1 -EnvironmentName "production" -ResourceGroupName "rg-production"
   ```

2. **Add secrets to Key Vault:**
   ```powershell
   .\scripts\add-secrets.ps1 -ResourceGroupName "rg-production"
   ```

   Or manually add secrets:
   ```bash
   # Get the Key Vault name
   az keyvault list --resource-group rg-production --query '[0].name' -o tsv

   # Add secrets
   az keyvault secret set --vault-name <keyvault-name> --name mongodb-uri --value "YOUR_MONGODB_CONNECTION_STRING"
   az keyvault secret set --vault-name <keyvault-name> --name openai-api-key --value "YOUR_OPENAI_API_KEY"
   az keyvault secret set --vault-name <keyvault-name> --name graph-client-id --value "YOUR_GRAPH_CLIENT_ID"
   az keyvault secret set --vault-name <keyvault-name> --name graph-client-secret --value "YOUR_GRAPH_CLIENT_SECRET"
   az keyvault secret set --vault-name <keyvault-name> --name azure-ocr-endpoint --value "YOUR_AZURE_OCR_ENDPOINT"
   az keyvault secret set --vault-name <keyvault-name> --name azure-ocr-key --value "YOUR_AZURE_OCR_KEY"
   ```

3. **Restart Container Apps** to apply secrets:
   ```bash
   az containerapp revision restart --name ca-frontend-* --resource-group rg-production
   az containerapp revision restart --name ca-backend-* --resource-group rg-production
   ```

### 🌐 Accessing Your Application

After successful deployment:

1. **Get application URLs:**
   ```bash
   azd show
   ```

2. **Test the application:**
   - Frontend: `https://<frontend-url>`
   - Backend API: `https://<backend-url>/api/health`

### 📊 Monitoring and Logs

1. **View application logs:**
   ```bash
   azd logs
   ```

2. **Monitor with Application Insights:**
   - Go to Azure Portal → Application Insights
   - View real-time metrics and logs

### 🔄 Updates and Redeployment

To deploy updates:

```bash
# Deploy changes
azd deploy

# Or deploy specific service
azd deploy frontend
azd deploy backend
```

### 🧹 Cleanup

To remove all resources:

```bash
azd down
```

## 📋 Required Secrets

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `mongodb-uri` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/db` |
| `openai-api-key` | OpenAI API key | `sk-proj-...` |
| `graph-client-id` | Microsoft Graph Client ID | `YOUR_GRAPH_CLIENT_ID` |
| `graph-client-secret` | Microsoft Graph Client Secret | `YOUR_GRAPH_CLIENT_SECRET` |
| `azure-ocr-endpoint` | Azure OCR endpoint | `https://eastus.api.cognitive.microsoft.com/` |
| `azure-ocr-key` | Azure OCR API key | `YOUR_AZURE_OCR_API_KEY` |

## 🏗️ Architecture

```mermaid
graph TB
    subgraph "Azure Container Apps Environment"
        FE[Frontend Container App<br/>React + Nginx]
        BE[Backend Container App<br/>Node.js + Express]
    end

    subgraph "Supporting Services"
        ACR[Container Registry]
        KV[Key Vault]
        AI[Application Insights]
        LAW[Log Analytics]
    end

    subgraph "External Services"
        MONGO[MongoDB Atlas]
        OPENAI[OpenAI API]
        GRAPH[Microsoft Graph]
        OCR[Azure OCR]
    end

    FE --> BE
    ACR --> FE
    ACR --> BE
    KV --> BE
    BE --> MONGO
    BE --> OPENAI
    BE --> GRAPH
    BE --> OCR
    FE --> AI
    BE --> AI
    AI --> LAW
```

## 🔧 Troubleshooting

### Common Issues

1. **Container apps not starting:**
   - Check logs: `azd logs`
   - Verify secrets are configured
   - Check environment variables

2. **Authentication issues:**
   - Verify Microsoft Graph app registration
   - Check redirect URIs in Azure AD
   - Ensure correct client ID/secret

3. **API connection issues:**
   - Verify CORS configuration
   - Check network connectivity
   - Verify environment variables

### Support Commands

```bash
# Check deployment status
azd show

# View logs
azd logs

# Check container app status
az containerapp list --resource-group rg-production

# Test health endpoints
curl https://<backend-url>/health
curl https://<frontend-url>/health
```

## 📚 Additional Resources

- [Azure Container Apps Documentation](https://docs.microsoft.com/en-us/azure/container-apps/)
- [Azure Developer CLI Documentation](https://docs.microsoft.com/en-us/azure/developer/azure-developer-cli/)
- [Microsoft Graph API Documentation](https://docs.microsoft.com/en-us/graph/)
- [OpenAI API Documentation](https://platform.openai.com/docs/)
