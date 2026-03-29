/**
 * INTEGRATION GUIDE: ExecutionHeader Component
 * 
 * Location: Add to your ExecutionDetail page component
 * File: fluxbase.co/src/pages/executions/[id].tsx (or similar)
 */

// 1. Import the component
import { ExecutionHeader } from '@/components/ExecutionHeader';

// 2. Fetch execution data (your existing query)
// Make sure it includes: actor_name, actor_type, token_name, token_tags
const execution = await fetchExecution(id);
// Returns: {
//   id: "exec_123",
//   method: "GET",
//   path: "/api/orders",
//   status: "error",
//   started_at: "2026-03-29T14:23:00Z",
//   duration_ms: 342,
//   actor_name: "github-actions",           ← FROM BACKEND
//   actor_type: "ci",                      ← FROM BACKEND
//   token_name: "Production API Key",      ← NEW (from JOIN)
//   token_tags: '["production"]',          ← NEW (from JOIN)
//   ...rest of execution data
// }

// 3. Render at TOP of ExecutionDetail
export default function ExecutionDetailPage() {
  const [execution, setExecution] = useState(null);

  return (
    <div className="p-6">
      {/* NEW: Add ExecutionHeader here (BEFORE everything else) */}
      <ExecutionHeader execution={execution} />

      {/* EXISTING: Rest of your execution detail content */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Logs</h2>
        {/* Your logs component */}
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Trace</h2>
        {/* Your trace component */}
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Checkpoints</h2>
        {/* Your checkpoints component */}
      </div>
    </div>
  );
}

/**
 * WHAT THIS DOES:
 * 
 * ✅ Shows WHO triggered the execution (actor_name + actor_type)
 * ✅ Shows WHAT token was used (token_name)
 * ✅ Shows CONTEXT (environment from tags)
 * ✅ Shows WHEN it happened (relative time)
 * ✅ Color-codes by status (success/error/timeout)
 * 
 * This is the "aha moment" — user immediately understands the context
 * without reading logs or traces.
 */
