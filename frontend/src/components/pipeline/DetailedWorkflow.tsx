import React from "react";
import { CheckCircle2, XCircle, Loader2, Circle, ArrowDown, ArrowRight } from "lucide-react";

export interface DetailedWorkflowProps {
  status: string;
  isDast?: boolean;
}

const Node = ({ label, state, icon: Icon, className = "" }: any) => {
  return (
    <div className={`relative flex flex-col items-center justify-center p-3 w-40 text-center rounded-lg border-2 shadow-sm bg-white z-10 ${state === 'active' ? 'border-blue-500 shadow-blue-100' : state === 'completed' ? 'border-green-500' : state === 'failed' ? 'border-red-500 bg-red-50' : 'border-slate-200'} ${className}`}>
      {state === "completed" && <CheckCircle2 className="w-6 h-6 text-green-500 mb-1" />}
      {state === "failed" && <XCircle className="w-6 h-6 text-red-500 mb-1" />}
      {state === "active" && <Loader2 className="w-6 h-6 text-blue-500 animate-spin mb-1" />}
      {state === "pending" && <Circle className="w-6 h-6 text-slate-300 mb-1" />}
      <span className={`text-xs font-semibold ${state === 'active' ? 'text-blue-700' : state === 'failed' ? 'text-red-700' : 'text-slate-700'}`}>
        {label}
      </span>
    </div>
  );
};

const Arrow = ({ className = "h-8" }: { className?: string }) => (
  <div className={`flex items-center justify-center text-slate-400 ${className}`}>
    <ArrowDown className="w-5 h-5" />
  </div>
);

export function DetailedWorkflow({ status, isDast = false }: DetailedWorkflowProps) {
  const statusLower = status.toLowerCase();
  let isFailed = statusLower === "failed" || statusLower === "quarantined";

  // Sequence for regular SAST/SCA
  const sequence = [
    "queued",              // 0: URL Analysis
    "building",            // 1: Source -> Docker Build
    "scanning",            // 2: Trivy -> SBOM
    "policy_evaluation",   // 3: Security Policy
    "deploying",           // 4: Kubernetes Deploy
    "completed"            // 5: Post Deploy
  ];

  let currentIndex = sequence.indexOf(statusLower);
  if (currentIndex === -1) {
    if (statusLower === "quarantined") currentIndex = 4; // Failed policy
    else if (statusLower === "failed") currentIndex = 2; // Assume failed at scanning if generic failed
    else currentIndex = 0;
  }

  const getState = (stageIndex: number, failureNode: boolean = false) => {
    if (isFailed) {
      if (failureNode && stageIndex === currentIndex) return "failed";
      if (!failureNode && stageIndex === currentIndex) return "failed";
      if (stageIndex < currentIndex) return "completed";
      return "pending";
    } else {
      if (statusLower === "completed") return "completed";
      if (stageIndex < currentIndex) return "completed";
      if (stageIndex === currentIndex) return "active";
      return "pending";
    }
  };

  if (isDast) {
    // Sequence for DAST
    const dastSequence = [
      "queued",              // 0: Target Verification
      "scanning",            // 1: DAST Scanners
      "policy_evaluation",   // 2: Security Policy
      "completed"            // 3: Completed
    ];
    let dastIndex = dastSequence.indexOf(statusLower);
    if (dastIndex === -1) {
      if (statusLower === "quarantined") dastIndex = 2;
      else if (statusLower === "failed") dastIndex = 1;
      else dastIndex = 0;
    }
    
    const getDastState = (stageIndex: number, failureNode: boolean = false) => {
      if (isFailed) {
        if (failureNode && stageIndex === dastIndex) return "failed";
        if (!failureNode && stageIndex === dastIndex) return "failed";
        if (stageIndex < dastIndex) return "completed";
        return "pending";
      } else {
        if (statusLower === "completed") return "completed";
        if (stageIndex < dastIndex) return "completed";
        if (stageIndex === dastIndex) return "active";
        return "pending";
      }
    };

    return (
      <div className="flex flex-col items-center py-8 bg-slate-50/50 rounded-xl border border-slate-200 my-4 overflow-x-auto w-full">
        <div className="min-w-[600px] flex flex-col items-center">
          <Node label="Target Verification" state={getDastState(0)} />
          <Arrow />
          
          <div className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-widest">DAST Scanners</div>
          <div className="flex gap-4 relative">
            <div className="absolute top-0 left-1/2 w-48 h-4 border-t-2 border-l-2 border-r-2 border-slate-300 -translate-x-1/2 -mt-4 rounded-t-lg z-0" />
            <Node label="HTTP Headers Analysis" state={getDastState(1)} />
            <Node label="Transport Security" state={getDastState(1)} />
            <Node label="CSP Verification" state={getDastState(1)} />
          </div>
          
          <div className="relative w-full flex justify-center mt-4">
             <div className="absolute top-0 left-1/2 w-48 h-4 border-b-2 border-l-2 border-r-2 border-slate-300 -translate-x-1/2 -mt-4 rounded-b-lg z-0" />
          </div>
          <Arrow className="h-6" />
          
          <Node label="Security Policy" state={getDastState(2)} />
          
          <div className="flex w-full justify-center mt-6 relative">
            <div className="absolute top-0 left-1/2 w-80 border-t-2 border-slate-300 -translate-x-1/2 z-0" />
            
            <div className="flex flex-col items-center w-1/2 relative pt-4">
              <div className="absolute top-[-10px] bg-white px-2 text-xs font-bold text-green-600 border border-green-200 rounded">PASS</div>
              <div className="absolute top-0 h-4 border-l-2 border-slate-300 z-0" />
              <Node label="Report Generation" state={statusLower === "quarantined" || isFailed ? 'pending' : getDastState(3)} />
            </div>

            <div className="flex flex-col items-center w-1/2 relative pt-4">
               <div className="absolute top-[-10px] bg-white px-2 text-xs font-bold text-red-600 border border-red-200 rounded">FAIL</div>
               <div className="absolute top-0 h-4 border-l-2 border-slate-300 z-0" />
               <Node 
                  label="Block + Report" 
                  state={statusLower === "quarantined" ? 'completed' : (isFailed && dastIndex > 1 ? 'failed' : 'pending')} 
                  className="border-red-200"
               />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-8 bg-slate-50/50 rounded-xl border border-slate-200 my-4 overflow-x-auto w-full">
      <div className="min-w-[600px] flex flex-col items-center">
        {/* Step 1 */}
        <Node label="URL Analysis" state={getState(0)} />
        <Arrow />
        
        {/* Step 2 */}
        <Node label="Source Acquisition" state={getState(1)} />
        <Arrow />
        
        {/* Step 3 */}
        <Node label="Docker Detection" state={getState(1)} />
        <Arrow />
        
        {/* Step 4 */}
        <Node label="Docker Build" state={getState(1)} />
        <Arrow />

        {/* Trivy Branching */}
        <div className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-widest">Trivy Scanners</div>
        <div className="flex gap-4 relative">
          <div className="absolute top-0 left-1/2 w-48 h-4 border-t-2 border-l-2 border-r-2 border-slate-300 -translate-x-1/2 -mt-4 rounded-t-lg z-0" />
          <Node label="Vulnerability Scan" state={getState(2)} />
          <Node label="Config Scan" state={getState(2)} />
          <Node label="Secrets Scan" state={getState(2)} />
        </div>
        
        <div className="relative w-full flex justify-center mt-4">
           <div className="absolute top-0 left-1/2 w-48 h-4 border-b-2 border-l-2 border-r-2 border-slate-300 -translate-x-1/2 -mt-4 rounded-b-lg z-0" />
        </div>

        <Arrow className="h-6" />

        {/* Step 6 */}
        <Node label="SBOM Generate" state={getState(2)} />
        <Arrow />
        
        {/* Step 7 */}
        <Node label="Security Policy" state={getState(3)} />
        
        {/* Policy Branching */}
        <div className="flex w-full justify-center mt-6 relative">
          {/* Horizontal connecting line */}
          <div className="absolute top-0 left-1/2 w-80 border-t-2 border-slate-300 -translate-x-1/2 z-0" />
          
          <div className="flex flex-col items-center w-1/2 relative pt-4">
            <div className="absolute top-[-10px] bg-white px-2 text-xs font-bold text-green-600 border border-green-200 rounded">PASS</div>
            <div className="absolute top-0 h-4 border-l-2 border-slate-300 z-0" />
            <Node label="Kubernetes Deployment" state={statusLower === "quarantined" || isFailed ? 'pending' : getState(4)} />
            <Arrow />
            <Node label="Post-Deployment Security Assessment" state={statusLower === "quarantined" || isFailed ? 'pending' : getState(5)} />
          </div>

          <div className="flex flex-col items-center w-1/2 relative pt-4">
             <div className="absolute top-[-10px] bg-white px-2 text-xs font-bold text-red-600 border border-red-200 rounded">FAIL</div>
             <div className="absolute top-0 h-4 border-l-2 border-slate-300 z-0" />
             <Node 
                label="Block + Report" 
                state={statusLower === "quarantined" ? 'completed' : (isFailed && currentIndex > 2 ? 'failed' : 'pending')} 
                className="border-red-200"
             />
          </div>
        </div>

      </div>
    </div>
  );
}
