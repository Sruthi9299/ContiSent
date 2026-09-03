import { CheckCircle2, XCircle, Loader2, Circle } from "lucide-react";

export interface PipelineStagesProps {
  status: string;
}

export function PipelineStages({ status }: PipelineStagesProps) {
  const stages = [
    { id: "image", name: "Image Extraction" },
    { id: "trivy", name: "Trivy Scan" },
    { id: "sbom", name: "SBOM Gen" },
    { id: "report", name: "Report Creation" }
  ];

  let currentStage = 0;
  const statusLower = status.toLowerCase();
  let isFailed = statusLower === "failed";
  
  if (statusLower === "queued" || statusLower === "building") {
    currentStage = 0; // Image extraction
  } else if (statusLower === "scanning") {
    currentStage = 1; // Trivy Scan
  } else if (statusLower === "policy_evaluation") {
    currentStage = 2; // SBOM Gen
  } else if (statusLower === "completed" || statusLower === "deploying" || statusLower === "quarantined") {
    currentStage = 4; // All done
  } else if (isFailed) {
    // If it failed, let's just assume it failed during the scan for visualization purposes
    currentStage = 1;
  }

  return (
    <div className="flex items-center">
      {stages.map((stage, index) => {
        let state = "pending"; 
        
        if (isFailed && index === currentStage) {
            state = "failed";
        } else if (index < currentStage) {
            state = "completed";
        } else if (index === currentStage && !isFailed) {
            state = "active";
        }

        return (
          <div key={stage.id} className="flex items-center">
             <div className="flex flex-col items-center gap-1 min-w-[80px]">
                {state === "completed" && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                {state === "failed" && <XCircle className="w-5 h-5 text-red-500" />}
                {state === "active" && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
                {state === "pending" && <Circle className="w-5 h-5 text-slate-300" />}
                <span className={`text-[10px] font-medium mt-1 whitespace-nowrap ${state === 'active' ? 'text-blue-600' : (state === 'failed' ? 'text-red-600' : 'text-slate-500')}`}>
                  {stage.name}
                </span>
             </div>
             {index < stages.length - 1 && (
                <div className={`w-8 h-[2px] mx-1 -mt-4 ${index < currentStage ? 'bg-green-500' : 'bg-slate-200'}`} />
             )}
          </div>
        )
      })}
    </div>
  );
}
