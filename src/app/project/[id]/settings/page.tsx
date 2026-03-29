"use client";
import { useEffect, useState, use, useCallback } from "react";
import { Bell, Globe, Plus, Trash2, Key, ShieldCheck, Copy, Check, Loader2, Send, Mail, Link2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertChannel, AlertRules, ServiceToken } from "@/types/api";
import { useFluxApi } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

export default function ProjectSettings({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const api = useFluxApi(id);
  const [alertChannels, setAlertChannels] = useState<AlertChannel[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [savingAlerts, setSavingAlerts] = useState(false);
  const [channelType, setChannelType] = useState<"webhook" | "email" | "slack">("webhook");
  const [channelTarget, setChannelTarget] = useState("");
  const [channelLabel, setChannelLabel] = useState("");
  const [alertRules, setAlertRules] = useState<AlertRules>({
    high_error_rate: { enabled: true, threshold_pct: 10, window_min: 15 },
    new_incident: { enabled: true },
    failure_spike: { enabled: false, multiplier: 2, window_min: 15 },
  });
  const [savingRules, setSavingRules] = useState(false);

  useEffect(() => {
    if (!api.ready) return;
    Promise.all([
      api.getAlertChannels(id),
      api.getAlertRules(id),
    ])
      .then(([channels, rules]) => {
        setAlertChannels(Array.isArray(channels) ? channels : []);
        if (rules) setAlertRules(rules);
      })
      .finally(() => setAlertsLoading(false));
  }, [api, api.ready, id]);

  const persistAlertChannels = async (next: AlertChannel[]) => {
    setAlertChannels(next);
    setSavingAlerts(true);
    try {
      await api.saveAlertChannels(next, id);
    } catch (err) {
      console.error("Failed to save alert channels:", err);
      alert("Failed to save alert channels.");
    } finally {
      setSavingAlerts(false);
    }
  };

  const addAlertChannel = async () => {
    const target = channelTarget.trim();
    if (!target) return;
    if (channelType === "email" && !target.includes("@")) {
      alert("Enter a valid email address.");
      return;
    }

    const next: AlertChannel[] = [
      {
        id: crypto.randomUUID(),
        type: channelType,
        target,
        enabled: true,
        label: channelLabel.trim() || undefined,
        created_at: new Date().toISOString(),
      },
      ...alertChannels,
    ];

    await persistAlertChannels(next);
    setChannelTarget("");
    setChannelLabel("");
  };

  const removeAlertChannel = async (channelId: string) => {
    const next = alertChannels.filter((channel) => channel.id !== channelId);
    await persistAlertChannels(next);
  };

  const toggleAlertChannel = async (channelId: string, enabled: boolean) => {
    const next = alertChannels.map((channel) => channel.id === channelId ? { ...channel, enabled } : channel);
    await persistAlertChannels(next);
  };

  const testAlertChannel = async (channelId: string) => {
    try {
      await api.testAlertChannel(channelId, id);
      alert("Test notification sent.");
    } catch (err) {
      console.error("Failed to send test alert:", err);
      alert("Failed to send test alert.");
    }
  };

  const persistAlertRules = async (next: AlertRules) => {
    setAlertRules(next);
    setSavingRules(true);
    try {
      await api.saveAlertRules(next, id);
    } catch (err) {
      console.error("Failed to save alert rules:", err);
      alert("Failed to save alert rules.");
    } finally {
      setSavingRules(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm("Are you sure you want to PERMANENTLY delete this project? This cannot be undone.")) {
      return;
    }

    try {
      await api.deleteProject(id);
      localStorage.removeItem("flux_last_project");
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Failed to delete project:", err);
      alert("Failed to delete project. Please try again.");
    }
  };

  return (
    <div className="space-y-10 max-w-4xl pb-24">
      <header>
        <h2 className="text-2xl font-bold text-white tracking-tight">Project Settings</h2>
        <p className="text-sm text-neutral-500 mt-1">Configure alerts, environment variables, and security.</p>
      </header>

      {/* ALERTS & NOTIFICATIONS */}
      <Card className="bg-[#111] border-neutral-900 shadow-xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-neutral-900/50 pb-6">
          <div className="space-y-1.5">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-neutral-500 flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Alerts & Notifications
            </CardTitle>
            <CardDescription className="text-xs text-neutral-600 font-medium italic">
              Notify webhook, email, or Slack when production issues appear and resolve.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[140px,1fr,1fr,auto] gap-2">
            <select
              value={channelType}
              onChange={(e) => setChannelType(e.target.value as "webhook" | "email" | "slack")}
              className="h-9 bg-black border border-neutral-800 rounded px-2 text-xs text-neutral-300"
            >
              <option value="webhook">Webhook</option>
              <option value="email">Email</option>
              <option value="slack">Slack</option>
            </select>
            <Input
              value={channelTarget}
              onChange={(e) => setChannelTarget(e.target.value)}
              placeholder={channelType === "email" ? "oncall@company.com" : channelType === "slack" ? "Slack incoming webhook URL" : "Webhook URL"}
              className="bg-black border-neutral-800 text-xs h-9"
            />
            <Input
              value={channelLabel}
              onChange={(e) => setChannelLabel(e.target.value)}
              placeholder="Label (optional)"
              className="bg-black border-neutral-800 text-xs h-9"
            />
            <Button onClick={addAlertChannel} disabled={savingAlerts || !channelTarget.trim()} size="sm" className="bg-white text-black hover:bg-neutral-200 font-bold h-9">
              <Plus className="w-3.5 h-3.5 mr-2" />
              Add
            </Button>
          </div>

          <p className="text-[10px] text-neutral-600 font-mono">No billing surprises. You always see usage first.</p>

          {alertsLoading ? (
            <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-neutral-800" /></div>
          ) : alertChannels.length === 0 ? (
            <div className="py-12 text-center text-neutral-700 font-mono text-[10px] uppercase tracking-widest border border-dashed border-neutral-800 rounded-lg bg-[#0c0c0c]">
              No alert channels configured.
            </div>
          ) : (
            alertChannels.map((channel) => (
              <div key={channel.id} className="bg-black border border-neutral-900 p-4 rounded-lg flex items-center justify-between gap-3 group hover:border-neutral-800 transition-colors">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 bg-[#0a0a0a] border border-neutral-900 rounded flex items-center justify-center text-neutral-700">
                    {channel.type === "email" ? <Mail className="w-4 h-4" /> : channel.type === "slack" ? <Send className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-mono text-neutral-300 truncate max-w-[360px]">{channel.target}</span>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[9px] font-bold text-blue-500 border-blue-500/20 bg-blue-500/5 px-2 py-0 uppercase">{channel.type}</Badge>
                      {channel.label && (
                        <Badge variant="outline" className="text-[9px] font-bold text-neutral-400 border-neutral-800 bg-neutral-900 px-2 py-0">{channel.label}</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Label className="flex items-center gap-2 text-[10px] text-neutral-500 font-mono">
                    <input
                      type="checkbox"
                      checked={channel.enabled}
                      onChange={(e) => toggleAlertChannel(channel.id, e.target.checked)}
                    />
                    Enabled
                  </Label>
                  <Button variant="outline" size="sm" onClick={() => testAlertChannel(channel.id)} className="h-8 text-[10px] uppercase font-black border-neutral-800 text-neutral-300 hover:text-white">
                    <Link2 className="w-3 h-3 mr-1" />
                    Test
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => removeAlertChannel(channel.id)} className="h-8 w-8 text-neutral-800 hover:text-red-500 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="bg-[#111] border-neutral-900 shadow-xl overflow-hidden">
        <CardHeader className="border-b border-neutral-900/50 pb-6">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-neutral-500">Alert Rules</CardTitle>
          <CardDescription className="text-xs text-neutral-600 font-medium italic">
            Define what should trigger notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-5">
          <div className="rounded-lg border border-neutral-900 bg-black p-4 space-y-2">
            <Label className="flex items-center gap-2 text-[11px] font-bold text-neutral-300">
              <input
                type="checkbox"
                checked={alertRules.high_error_rate.enabled}
                onChange={(e) => persistAlertRules({
                  ...alertRules,
                  high_error_rate: { ...alertRules.high_error_rate, enabled: e.target.checked },
                })}
              />
              High error rate
            </Label>
            <p className="text-[10px] text-neutral-600 font-mono">Trigger when error rate exceeds threshold in rolling window.</p>
            <div className="flex items-center gap-2 text-[10px] text-neutral-500 font-mono">
              <span>&gt;</span>
              <Input
                type="number"
                value={alertRules.high_error_rate.threshold_pct}
                min={1}
                max={100}
                className="w-20 h-8 bg-neutral-950 border-neutral-800"
                onChange={(e) => persistAlertRules({
                  ...alertRules,
                  high_error_rate: {
                    ...alertRules.high_error_rate,
                    threshold_pct: Math.max(1, Math.min(100, Number(e.target.value || 10))),
                  },
                })}
              />
              <span>% in last</span>
              <Input
                type="number"
                value={alertRules.high_error_rate.window_min}
                min={1}
                max={240}
                className="w-20 h-8 bg-neutral-950 border-neutral-800"
                onChange={(e) => persistAlertRules({
                  ...alertRules,
                  high_error_rate: {
                    ...alertRules.high_error_rate,
                    window_min: Math.max(1, Math.min(240, Number(e.target.value || 15))),
                  },
                })}
              />
              <span>min</span>
            </div>
          </div>

          <div className="rounded-lg border border-neutral-900 bg-black p-4 space-y-2">
            <Label className="flex items-center gap-2 text-[11px] font-bold text-neutral-300">
              <input
                type="checkbox"
                checked={alertRules.new_incident.enabled}
                onChange={(e) => persistAlertRules({
                  ...alertRules,
                  new_incident: { enabled: e.target.checked },
                })}
              />
              New incident created
            </Label>
            <p className="text-[10px] text-neutral-600 font-mono">Send an alert immediately when a new incident state is created.</p>
          </div>

          <div className="rounded-lg border border-neutral-900 bg-black p-4 space-y-2">
            <Label className="flex items-center gap-2 text-[11px] font-bold text-neutral-300">
              <input
                type="checkbox"
                checked={alertRules.failure_spike.enabled}
                onChange={(e) => persistAlertRules({
                  ...alertRules,
                  failure_spike: { ...alertRules.failure_spike, enabled: e.target.checked },
                })}
              />
              Failure spike detected
            </Label>
            <p className="text-[10px] text-neutral-600 font-mono">Trigger when current window failures spike vs previous window.</p>
            <div className="flex items-center gap-2 text-[10px] text-neutral-500 font-mono">
              <span>Current &gt;=</span>
              <Input
                type="number"
                value={alertRules.failure_spike.multiplier}
                min={1.1}
                step={0.1}
                max={10}
                className="w-20 h-8 bg-neutral-950 border-neutral-800"
                onChange={(e) => persistAlertRules({
                  ...alertRules,
                  failure_spike: {
                    ...alertRules.failure_spike,
                    multiplier: Math.max(1.1, Math.min(10, Number(e.target.value || 2))),
                  },
                })}
              />
              <span>x previous in last</span>
              <Input
                type="number"
                value={alertRules.failure_spike.window_min}
                min={1}
                max={240}
                className="w-20 h-8 bg-neutral-950 border-neutral-800"
                onChange={(e) => persistAlertRules({
                  ...alertRules,
                  failure_spike: {
                    ...alertRules.failure_spike,
                    window_min: Math.max(1, Math.min(240, Number(e.target.value || 15))),
                  },
                })}
              />
              <span>min</span>
            </div>
          </div>

          <p className="text-[10px] text-neutral-600 font-mono">
            {savingRules ? "Saving rules..." : "Rules are saved automatically."}
          </p>
        </CardContent>
      </Card>

      {/* API KEYS / SECRETS */}
      <Card className="bg-[#111] border-neutral-900 shadow-xl overflow-hidden">
        <CardHeader className="border-b border-neutral-900/50 pb-6">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-neutral-500 flex items-center gap-2">
            <Key className="w-4 h-4" />
            Environment Secrets
          </CardTitle>
          <CardDescription className="text-xs text-neutral-600 font-medium italic">
            Shared secrets accessible across all functions in this environment.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-8 flex flex-col gap-6 max-w-lg">
           <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-neutral-600 tracking-wider">DATABASE_URL</Label>
              <div className="flex gap-2">
                 <Input type="password" value="************************" readOnly className="flex-1 bg-black border-neutral-800 text-xs text-neutral-500 h-9 font-mono" />
                 <Button variant="outline" size="sm" className="bg-neutral-900 border-neutral-800 h-9 font-bold text-[11px] uppercase tracking-tight">Reveal</Button>
              </div>
           </div>
           <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-neutral-600 tracking-wider">STRIPE_SECRET_KEY</Label>
              <div className="flex gap-2">
                 <Input type="password" value="************************" readOnly className="flex-1 bg-black border-neutral-800 text-xs text-neutral-500 h-9 font-mono" />
                 <Button variant="outline" size="sm" className="bg-neutral-900 border-neutral-800 h-9 font-bold text-[11px] uppercase tracking-tight">Reveal</Button>
              </div>
           </div>
           <Button variant="link" className="text-blue-500 hover:text-blue-400 font-bold text-xs p-0 h-auto justify-start w-fit mt-2">
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add secret variable
           </Button>
        </CardContent>
      </Card>

      {/* SERVICE TOKENS */}
      <ServiceTokensSection projectId={id} />

      {/* DANGER ZONE */}
      <Card className="bg-[#111] border-red-900/20 shadow-xl overflow-hidden">
        <CardHeader className="bg-red-950/5 border-b border-red-900/10">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-red-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
           <div className="flex items-center justify-between p-5 border border-red-900/20 rounded-lg bg-red-950/5">
              <div className="space-y-1">
                 <h4 className="text-white font-bold text-sm tracking-tight">Delete Project</h4>
                 <p className="text-neutral-600 text-xs italic">Permanently remove this environment and all telemetry logs.</p>
              </div>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleDeleteProject}
                className="bg-red-600 text-white font-bold text-[10px] uppercase tracking-widest px-6 h-9 shadow-lg shadow-red-600/10 hover:bg-red-500"
              >
                Nuclear Option
              </Button>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ServiceTokensSection({ projectId }: { projectId: string }) {
  const api = useFluxApi(projectId);
  const [tokens, setTokens] = useState<ServiceToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTokenName, setNewTokenName] = useState("");
  const [lastCreatedToken, setLastCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadTokens = useCallback(async () => {
    try {
      const data = await api.getServiceTokens();
      setTokens(data);
    } catch (err) {
      console.error("Failed to load tokens:", err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (api.ready) loadTokens();
  }, [api.ready, loadTokens]);

  const handleCreate = async () => {
    if (!newTokenName.trim()) return;
    setCreating(true);
    try {
      const token = await api.createServiceToken(newTokenName);
      setLastCreatedToken(token.token || null);
      setNewTokenName("");
      loadTokens();
    } catch (err) {
      console.error("Failed to create token:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this token? It will stop working immediately.")) return;
    try {
      await api.revokeServiceToken(id);
      loadTokens();
    } catch (err) {
      console.error("Failed to revoke token:", err);
    }
  };

  const copyToClipboard = () => {
    if (!lastCreatedToken) return;
    navigator.clipboard.writeText(lastCreatedToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="bg-[#111] border-neutral-900 shadow-xl overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between border-b border-neutral-900/50 pb-6">
        <div className="space-y-1.5">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-neutral-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            Service Tokens
          </CardTitle>
          <CardDescription className="text-xs text-neutral-600 font-medium italic">
            Tokens for authenticating flux-run or direct ingestion.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Create Form */}
        <div className="flex gap-2 max-w-md">
          <Input 
            placeholder="Token name (e.g. GitHub Action)" 
            value={newTokenName}
            onChange={(e) => setNewTokenName(e.target.value)}
            className="bg-black border-neutral-800 text-xs h-9"
          />
          <Button 
            onClick={handleCreate} 
            disabled={creating || !newTokenName}
            size="sm" 
            className="bg-white text-black hover:bg-neutral-200 font-bold h-9"
          >
            {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-2" />}
            Create
          </Button>
        </div>

        {/* Success Modal/Banner for New Token */}
        {lastCreatedToken && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Token Created Successfully</span>
              <Button variant="ghost" size="sm" onClick={() => setLastCreatedToken(null)} className="h-6 text-[10px] text-neutral-500 hover:text-white uppercase font-bold">Close</Button>
            </div>
            <p className="text-[11px] text-neutral-400">Copy this token now. It will <span className="text-white font-bold">never</span> be shown again.</p>
            <div className="flex gap-2">
              <Input value={lastCreatedToken} readOnly className="flex-1 bg-black border-blue-500/30 text-xs text-blue-400 h-9 font-mono" />
              <Button onClick={copyToClipboard} size="sm" className="bg-blue-600 hover:bg-blue-500 text-white h-9 px-4">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>
        )}

        {/* Token List */}
        <div className="space-y-2">
          <div className="grid grid-cols-5 px-4 py-2 text-[9px] font-bold text-neutral-600 uppercase tracking-widest border-b border-neutral-900/50">
            <div className="col-span-1">Name</div>
            <div className="col-span-1 text-center">Created</div>
            <div className="col-span-1 text-center">Last Used</div>
            <div className="col-span-1 text-center">Usage (24h)</div>
            <div className="col-span-1 text-right">Action</div>
          </div>

          {loading ? (
             <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-neutral-800" /></div>
          ) : tokens.length === 0 ? (
            <div className="py-12 text-center text-neutral-700 font-mono text-[10px] uppercase tracking-widest border border-dashed border-neutral-800 rounded-lg bg-[#0c0c0c]">
               No service tokens.
            </div>
          ) : (
            tokens.map(token => (
              <div key={token.id} className="grid grid-cols-5 items-center px-4 py-3 bg-black border border-neutral-900 rounded-lg group hover:border-neutral-800 transition-colors">
                <div className="col-span-1">
                  <span className="text-xs font-bold text-neutral-300">{token.name || "Unnamed Token"}</span>
                </div>
                <div className="col-span-1 text-center">
                  <span className="text-[10px] text-neutral-600 font-mono uppercase">
                    {formatDistanceToNow(new Date(token.created_at))} ago
                  </span>
                </div>
                <div className="col-span-1 text-center">
                  <span className="text-[10px] text-neutral-500 font-mono uppercase">
                    {token.last_used_at ? `${formatDistanceToNow(new Date(token.last_used_at))} ago` : "Never"}
                  </span>
                </div>
                <div className="col-span-1 text-center">
                  <Badge variant="outline" className="text-[10px] font-mono border-neutral-800 bg-neutral-900/50 text-neutral-400">
                    {token.usage_24h || 0} reqs
                  </Badge>
                </div>
                <div className="col-span-1 text-right">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleRevoke(token.id)} 
                    className="h-8 w-8 text-neutral-800 hover:text-red-500 lg:opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
