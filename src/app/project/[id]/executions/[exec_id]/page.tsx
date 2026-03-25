"use client";
import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";

export default function ExecutionDetail({ params }: { params: { id: string, exec_id: string } }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchApi(`/executions/${params.exec_id}`).then(setData).catch(console.error);
  }, [params.exec_id]);

  if (!data) return <div className="text-neutral-500 animate-pulse font-mono text-sm">Loading execution matrix...</div>;

  const reqObj = typeof data.request === "string" ? JSON.parse(data.request) : data.request;
  let resObj = typeof data.response === "string" ? JSON.parse(data.response) : data.response;
  if (!resObj && data.error) resObj = { error: data.error };

  return (
    <div className="flex flex-col gap-10 pb-16">
      <div className="pb-6 border-b border-neutral-900">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-4">
          <span className={`text-sm px-2.5 py-0.5 rounded font-mono ${data.status === 'ok' ? 'bg-green-900/30 text-green-400 border border-green-900' : 'bg-red-900/30 text-red-500 border border-red-900'}`}>
            {data.status === 'ok' ? 'Success' : 'Failed'}
          </span>
          <div className="font-mono text-lg flex items-center">
            <span className="text-neutral-500 mr-3">{data.method}</span>
            {data.path}
          </div>
        </h2>
        <p className="text-neutral-500 font-mono text-sm mt-3 opacity-80">{params.exec_id} <span className="mx-2">•</span> {data.duration_ms}ms</p>
      </div>

      <section>
        <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500 mb-3">Replay Locally</h3>
        <div className="bg-[#111] border border-neutral-800 p-4 rounded-lg flex items-center justify-between font-mono text-sm group shadow-inner">
          <code className="text-blue-400">flux replay {params.exec_id}</code>
          <button 
            onClick={() => void navigator.clipboard.writeText(`flux replay ${params.exec_id}`)}
            className="text-neutral-500 hover:text-white transition bg-black px-3 py-1 rounded border border-neutral-800"
          >
            Copy
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <section className="flex flex-col">
          <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500 mb-3">Request Payload</h3>
          <pre className="bg-[#0c0c0c] border border-neutral-800 p-4 rounded-lg overflow-x-auto text-[13px] leading-relaxed font-mono text-neutral-300 shadow-inner max-h-[500px] overflow-y-auto">
            {JSON.stringify(reqObj, null, 2)}
          </pre>
        </section>
        <section className="flex flex-col">
          <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500 mb-3">Response Payload</h3>
          <pre className="bg-[#0c0c0c] border border-neutral-800 p-4 rounded-lg overflow-x-auto text-[13px] leading-relaxed font-mono text-neutral-300 shadow-inner max-h-[500px] overflow-y-auto">
            {JSON.stringify(resObj, null, 2)}
          </pre>
        </section>
      </div>

      {data.checkpoints && data.checkpoints.length > 0 && (
        <section>
          <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500 mb-3">Deterministic I/O Matrix ({data.checkpoints.length})</h3>
          <div className="flex flex-col gap-2">
            {data.checkpoints.map((cp: any, i: number) => (
              <div key={i} className="bg-[#111] border border-neutral-800 px-4 py-3 rounded-lg flex items-center justify-between font-mono text-[13px]">
                <div className="flex gap-4 items-center">
                  <span className="text-neutral-600">[{i}]</span>
                  <span className="text-purple-400 font-bold">{cp.boundary.toUpperCase()}</span>
                </div>
                <span className="text-neutral-500 opacity-60">{cp.duration_ms}ms</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.logs && data.logs.length > 0 && (
        <section>
          <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500 mb-3">Isolate Console Out</h3>
          <pre className="bg-[#0c0c0c] border border-neutral-800 p-4 rounded-lg overflow-x-auto text-[13px] font-mono text-neutral-400 space-y-1 shadow-inner">
            {data.logs.map((L: any) => (
              <div key={L.seq} className="flex gap-4 border-l-2 pl-3 border-neutral-800 hover:bg-[#111] transition px-2 py-1">
                <span className="text-neutral-600 opacity-70 w-16">{(L.elapsed_ms/1000).toFixed(3)}s</span>
                <span className={L.level === 'error' ? 'text-red-400' : 'text-neutral-300'}>{L.args_json}</span>
              </div>
            ))}
          </pre>
        </section>
      )}
    </div>
  );
}
