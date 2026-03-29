import React from 'react';
import { formatDistanceToNow } from 'date-fns';

export interface Execution {
  id: string;
  method: string;
  path: string;
  status: 'success' | 'error' | 'timeout';
  started_at: string;
  duration_ms: number;
  actor_name?: string;
  actor_type?: string;
  token_name?: string;
  token_tags?: string;
}

interface ExecutionHeaderProps {
  execution: Execution;
}

export const ExecutionHeader: React.FC<ExecutionHeaderProps> = ({ execution }) => {
  const statusColor = {
    success: 'text-green-600 bg-green-50 border-green-200',
    error: 'text-red-600 bg-red-50 border-red-200',
    timeout: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  }[execution.status];

  const statusBorder = {
    success: 'border-l-4 border-green-500',
    error: 'border-l-4 border-red-500',
    timeout: 'border-l-4 border-yellow-500',
  }[execution.status];

  const tags = execution.token_tags ? JSON.parse(execution.token_tags) : [];
  const environment = tags.length > 0 ? tags[0] : 'default';

  const timeAgo = formatDistanceToNow(new Date(execution.started_at), {
    addSuffix: true,
  });

  return (
    <div className={`rounded-lg border ${statusBorder} p-6 mb-6 ${statusColor}`}>
      {/* Title Row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-lg font-semibold">
            {execution.method} {execution.path}
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            execution.status === 'success' 
              ? 'bg-green-100 text-green-800' 
              : execution.status === 'error'
              ? 'bg-red-100 text-red-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {execution.status === 'success' ? '✓ 200 OK' : 
             execution.status === 'error' ? '✗ Error' : 
             '⏱ Timeout'}
          </span>
          <span className="text-sm font-medium opacity-75">
            {execution.duration_ms}ms
          </span>
        </div>
      </div>

      {/* Actor Attribution Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Triggered By */}
        <div>
          <div className="text-xs font-semibold opacity-60 uppercase tracking-wide mb-1">
            Triggered by
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-current opacity-60"></div>
            <span className="text-sm font-medium">
              {execution.actor_name || 'Anonymous'}
            </span>
            {execution.actor_type && (
              <span className="text-xs px-2 py-0.5 rounded bg-current bg-opacity-20 font-mono">
                {execution.actor_type}
              </span>
            )}
          </div>
        </div>

        {/* Via Token */}
        <div>
          <div className="text-xs font-semibold opacity-60 uppercase tracking-wide mb-1">
            Via token
          </div>
          <div className="text-sm font-medium">
            {execution.token_name || 'Unknown Token'}
          </div>
        </div>

        {/* Environment */}
        {environment !== 'default' && (
          <div>
            <div className="text-xs font-semibold opacity-60 uppercase tracking-wide mb-1">
              Environment
            </div>
            <div className="text-sm font-medium px-2 py-1 rounded bg-current bg-opacity-10">
              {environment}
            </div>
          </div>
        )}

        {/* When */}
        <div>
          <div className="text-xs font-semibold opacity-60 uppercase tracking-wide mb-1">
            Time
          </div>
          <div className="text-sm font-medium">{timeAgo}</div>
        </div>
      </div>

      {/* Quick Context */}
      <div className="mt-4 pt-4 border-t border-current border-opacity-20">
        <p className="text-xs opacity-60">
          {execution.status === 'success' 
            ? `Execution completed successfully via ${execution.actor_name || 'automated'} trigger`
            : `Execution failed - triggered by ${execution.actor_name || 'automated'} using ${execution.token_name || 'token'}`}
        </p>
      </div>
    </div>
  );
};

export default ExecutionHeader;
