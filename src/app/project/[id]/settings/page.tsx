"use client";
import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";

export default function Settings({ params }: { params: { id: string } }) {
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [url, setUrl] = useState("");

  const loadDocs = () => fetchApi(`/webhooks?project_id=${params.id}`).then(setWebhooks).catch(console.error);

  useEffect(() => { loadDocs(); }, [params.id]);

  async function addWebhook(e: React.FormEvent) {
    e.preventDefault();
    if (!url) return;
    try {
      await fetchApi("/webhooks", { method: "POST", body: JSON.stringify({ project_id: params.id, url }) });
      setUrl("");
      loadDocs();
    } catch(err) { console.error(err); }
  }

  async function removeWebhook(id: string) {
    try {
      await fetchApi(`/webhooks/${id}`, { method: "DELETE" });
      loadDocs();
    } catch(err) { console.error(err); }
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-semibold text-white mb-6">Settings</h2>
      
      <section className="bg-[#111] border border-neutral-800 rounded-lg p-6">
        <h3 className="text-lg font-medium text-neutral-200 mb-2">Failure Webhooks</h3>
        <p className="text-sm text-neutral-500 mb-6">Get instantly notified via HTTP POST when a deterministic execution throws a fatal exception in production.</p>
        
        <form onSubmit={addWebhook} className="flex gap-3 mb-8">
          <input 
            type="url" required placeholder="https://api.incident.io/webhook"
            value={url} onChange={e => setUrl(e.target.value)}
            className="flex-1 bg-black border border-neutral-800 text-sm focus:border-neutral-500 outline-none p-2.5 rounded text-white"
          />
          <button className="bg-neutral-100 text-black px-4 py-2 rounded text-sm font-medium hover:bg-neutral-300 transition whitespace-nowrap">Add Webhook</button>
        </form>

        <div className="flex flex-col gap-2">
          {webhooks.map(w => (
            <div key={w.id} className="flex items-center justify-between bg-black border border-neutral-800 p-3 rounded font-mono text-sm group">
              <div className="flex flex-col">
                <span className="text-neutral-300">{w.url}</span>
                <span className="text-neutral-600 text-xs mt-0.5 uppercase tracking-wider">Event / execution.failed</span>
              </div>
              <button onClick={() => removeWebhook(w.id)} className="text-neutral-500 hover:text-red-400 transition ml-4 opacity-0 group-hover:opacity-100">Remove</button>
            </div>
          ))}
          {webhooks.length === 0 && <span className="text-neutral-500 text-sm font-mono italic">No webhooks registered.</span>}
        </div>
      </section>
    </div>
  );
}
