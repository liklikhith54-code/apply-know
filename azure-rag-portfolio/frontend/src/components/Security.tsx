import React from 'react';
import { ShieldCheck, GitFork, Lock, Network, KeyRound } from 'lucide-react';

export const Security: React.FC = () => {
  const securityFeatures = [
    {
      title: "Keyless Authentication (Managed Identity)",
      icon: <KeyRound className="w-5 h-5 text-azure-400" />,
      desc: "Remove hardcoded credentials entirely. Azure App Service utilizes Azure Managed Identity to acquire dynamic OAuth 2.0 Entra ID tokens to connect securely to Azure OpenAI and Azure AI Search endpoints."
    },
    {
      title: "Network Isolation (Private Endpoints)",
      icon: <Network className="w-5 h-5 text-teal-400" />,
      desc: "Restrict internet access to your vector database and OpenAI models. All traffic between the frontend server, API backend, search service, and OpenAI resource travels inside custom Virtual Networks (VNets)."
    },
    {
      title: "Role-Based Access Control (RBAC)",
      icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
      desc: "Enforce the principle of least privilege. The backend's identity is assigned roles like 'Search Index Data Reader' or 'Cognitive Services OpenAI User', blocking write or administrative access."
    },
    {
      title: "Data Protection & Encryption",
      icon: <Lock className="w-5 h-5 text-indigo-400" />,
      desc: "Azure handles data encryption at rest using customer-managed keys (CMK) in Azure Key Vault. All query vectors and payload data in-transit are encrypted using TLS 1.2+."
    }
  ];

  const deploymentSteps = [
    { name: "GitHub Repository", detail: "Secrets and environment configurations stored securely in Actions." },
    { name: "CI/CD Deployment Actions", detail: "Automatically lint, test endpoints, and package files into Docker." },
    { name: "Azure App Service (FastAPI)", detail: "Runs the FastAPI API backend, dynamically loading Managed Identity tokens." },
    { name: "Azure AI Search Service", detail: "Executes hybrid indexes search. Accessible only via Private Endpoint endpoints." },
    { name: "Azure OpenAI Models", detail: "Generates completion prompts inside secluded tenant networks." }
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-azure-400 to-teal-400 bg-clip-text text-transparent">
          Security Architecture & Deployment Pipeline
        </h2>
        <p className="text-slate-400 text-sm">
          Examine enterprise security integrations, keyless authentication pipelines, and CI/CD workflows for Azure RAG implementations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Security Features */}
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 px-1">
            <Lock className="w-5 h-5 text-azure-400" />
            Enterprise Security Best Practices
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {securityFeatures.map((feat, idx) => (
              <div key={idx} className="glass-panel p-5 rounded-2xl flex flex-col justify-between gap-3">
                <div className="space-y-3">
                  <div className="p-2.5 bg-slate-950 w-fit rounded-lg border border-slate-800">
                    {feat.icon}
                  </div>
                  <h4 className="text-sm font-bold text-slate-100">{feat.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Prompt injection warning card */}
          <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              ⚠️ Prompt Injection Safeguards
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Never pass unvalidated user questions directly into prompts. The system uses specific XML wrappers, runs input sanitization queries on FastAPI, and activates Azure AI Content Safety filters to discard jailbreak attempts.
            </p>
          </div>
        </div>

        {/* Deployment Pipeline Diagram */}
        <div className="glass-panel p-6 rounded-2xl shadow-xl space-y-6">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
            <GitFork className="w-5 h-5 text-teal-400" />
            CI/CD to Azure Infrastructure Flow
          </h3>

          {/* Deployment list */}
          <div className="space-y-4 relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {deploymentSteps.map((step, idx) => (
              <div key={idx} className="relative space-y-1">
                {/* Node icon dot */}
                <div className="absolute -left-[22px] top-1 w-3 h-3 bg-azure-500 rounded-full border-2 border-slate-900 shadow-md shadow-azure-500/25" />
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-azure-400 uppercase tracking-wider">Step {idx + 1}</span>
                  <span className="text-xs font-bold text-slate-200">{step.name}</span>
                </div>
                <p className="text-xs text-slate-400">{step.detail}</p>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-800/80">
            <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Example Azure CI/CD Config YAML</h4>
            <pre className="bg-slate-950 p-4 rounded-xl border border-slate-900 text-[10px] text-slate-300 font-mono overflow-x-auto leading-relaxed select-all">
{`name: Deploy FastAPI backend to Azure App Service
on:
  push:
    branches: [ main ]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
      - name: Install dependencies
        run: pip install -r backend/requirements.txt
      - name: Zip Artifacts
        run: zip -r release.zip .
      - name: Deploy to Azure App Service
        uses: azure/webapps-deploy@v2
        with:
          app-name: 'azure-rag-portfolio-api'
          publish-profile: \${{ secrets.AZURE_PUBLISH_PROFILE }}
          package: 'release.zip'`}
            </pre>
          </div>
        </div>

      </div>
    </div>
  );
};
