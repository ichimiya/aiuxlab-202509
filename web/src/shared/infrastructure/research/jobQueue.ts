import type {
  ResearchExecutionJobPort,
  ResearchJobTrigger,
} from "@/shared/useCases/ports/research";
import type { ProcessResearchJob } from "@/shared/useCases/ProcessResearchJob";

interface CreateJobQueueOptions {
  processJob: ProcessResearchJob;
}

type QueuedJob = {
  researchId: string;
  trigger: ResearchJobTrigger;
};

export function createResearchExecutionJobPort(
  options: CreateJobQueueOptions,
): ResearchExecutionJobPort {
  const queue: QueuedJob[] = [];
  let draining = false;

  async function drainQueue() {
    if (draining) return;
    draining = true;
    try {
      while (queue.length > 0) {
        const job = queue.shift();
        if (!job) {
          continue;
        }
        await options.processJob.handle({ researchId: job.researchId });
      }
    } finally {
      draining = false;
    }
  }

  function scheduleDrain() {
    queueMicrotask(() => {
      drainQueue().catch((error) => {
        console.error("Failed to process research job", error);
      });
    });
  }

  return {
    async enqueue(job) {
      queue.push(job);
      scheduleDrain();
    },
  };
}
