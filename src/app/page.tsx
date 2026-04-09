"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { DailyBrief, Story, StoryCategory } from "@/lib/types";

const CATEGORY_COLORS: Record<StoryCategory, string> = {
  AWARD: "bg-navy text-white",
  SOLICITATION: "bg-accent-green text-white",
  RECOMPETE: "bg-accent-amber text-white",
  BUDGET: "bg-accent-purple text-white",
  REGULATORY: "bg-slate text-white",
  MARKET: "bg-navy-light text-white",
};

function formatCurrency(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

function LiveClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    function tick() {
      const now = new Date();
      const opts: Intl.DateTimeFormatOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: "America/New_York",
      };
      const formatted = now
        .toLocaleDateString("en-US", opts)
        .toUpperCase()
        .replace(",", "")
        .replace(/ AT /, " | ");
      setTime(formatted + " ET");
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return <span className="font-mono text-sm tracking-wide">{time}</span>;
}

function SignificanceBar({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`w-2 h-3 rounded-sm ${
            i <= level ? "bg-navy" : "bg-card-border"
          }`}
        />
      ))}
    </div>
  );
}

function StoryCard({
  story,
  stories,
}: {
  story: Story;
  stories: Story[];
}) {
  const connections = stories.filter((s) => story.connections.includes(s.id));
  return (
    <div className="bg-card-bg border border-card-border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded ${CATEGORY_COLORS[story.category]}`}
          >
            {story.category}
          </span>
          <SignificanceBar level={story.significance} />
        </div>
      </div>
      <h3 className="font-semibold text-foreground leading-snug">
        {story.headline}
      </h3>
      <p className="text-sm text-slate leading-relaxed">{story.summary}</p>
      <p className="text-sm text-foreground/80 leading-relaxed italic">
        {story.analysis}
      </p>
      {connections.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-slate">Related:</span>
          {connections.map((c) => (
            <span
              key={c.id}
              className="text-xs bg-panel-bg text-slate px-2 py-0.5 rounded"
            >
              {c.headline.slice(0, 40)}...
            </span>
          ))}
        </div>
      )}
      <a
        href={story.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-xs text-navy-light hover:underline"
      >
        Source: {story.sourceName} ↗
      </a>
    </div>
  );
}

function ChatDrawer() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, status } =
    useChat({ transport: new DefaultChatTransport({ api: "/api/chat" }) });
  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-navy text-white shadow-lg flex items-center justify-center hover:bg-navy-light transition-colors"
        aria-label="Open chat"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-96 h-[500px] bg-card-bg border border-card-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
          <div className="bg-navy text-white px-4 py-3 flex items-center justify-between">
            <span className="font-semibold text-sm">
              GovCon Intelligence Analyst
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-sm text-slate">
                Ask about federal contracts, opportunities, budget signals, or
                market trends...
              </p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-panel-bg rounded-lg p-3 ml-8"
                    : "text-foreground"
                }`}
              >
                {m.parts?.filter(p => p.type === "text").map((p, i) => (
                  <span key={i}>{p.type === "text" ? p.text : ""}</span>
                ))}
              </div>
            ))}
            {isLoading && (
              <div className="text-sm text-slate animate-pulse">
                Analyzing...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!input.trim() || isLoading) return;
              sendMessage({ text: input });
              setInput("");
            }}
            className="border-t border-card-border p-3 flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about GovCon intelligence..."
              className="flex-1 text-sm bg-panel-bg border border-card-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy/30"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-navy text-white text-sm px-4 py-2 rounded-lg hover:bg-navy-light disabled:opacity-50 transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}

export default function Home() {
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBrief = useCallback(async () => {
    try {
      const res = await fetch("/api/brief");
      if (res.status === 404) {
        setBrief(null);
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBrief(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrief();
  }, [fetchBrief]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-navy border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate text-sm">Loading intelligence brief...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-card-bg border border-accent-red/20 rounded-lg p-6 max-w-md text-center">
          <p className="text-accent-red font-semibold">Error loading brief</p>
          <p className="text-sm text-slate mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!brief) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-card-bg border border-card-border rounded-lg p-8 max-w-md text-center space-y-4">
          <div className="w-12 h-12 bg-panel-bg rounded-full flex items-center justify-center mx-auto">
            <svg
              className="w-6 h-6 text-slate"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Standby — Brief Pending
          </h2>
          <p className="text-sm text-slate">
            The daily intelligence brief has not been generated yet. The brief is
            generated automatically at 10:00 UTC (6:00 AM ET) each day.
          </p>
        </div>
      </div>
    );
  }

  const sortedStories = [...brief.stories].sort(
    (a, b) => b.significance - a.significance
  );
  const topStories = sortedStories.filter((s) =>
    brief.topStoryIds.includes(s.id)
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-card-bg/95 backdrop-blur border-b border-card-border">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-navy tracking-tight">
              GOVCON BRIEF
            </h1>
            <span className="text-xs text-slate-light hidden sm:inline">
              Federal Contracting Intelligence
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate">
            <LiveClock />
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-accent-green pulse-dot" />
              <span className="hidden sm:inline">
                Updated{" "}
                {new Date(brief.generatedAt).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "America/New_York",
                })}{" "}
                ET
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* BLUF */}
        <section className="bg-card-bg border border-card-border rounded-lg overflow-hidden">
          <div className="flex">
            <div className="w-1.5 bg-navy shrink-0" />
            <div className="p-5 sm:p-6">
              <h2 className="text-xs font-bold text-navy uppercase tracking-widest mb-2">
                Bottom Line Up Front
              </h2>
              <p className="text-foreground leading-relaxed text-base sm:text-lg">
                {brief.bluf}
              </p>
            </div>
          </div>
        </section>

        {/* Top Stories Highlight */}
        {topStories.length > 0 && (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topStories.map((story) => (
              <div
                key={story.id}
                className="bg-card-bg border-2 border-navy/20 rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-navy uppercase">
                    Top Story
                  </span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded ${CATEGORY_COLORS[story.category]}`}
                  >
                    {story.category}
                  </span>
                </div>
                <h3 className="font-semibold text-foreground">
                  {story.headline}
                </h3>
                <p className="text-sm text-slate">{story.summary}</p>
                <a
                  href={story.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs text-navy-light hover:underline"
                >
                  Source: {story.sourceName} ↗
                </a>
              </div>
            ))}
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content — 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Awards */}
            <section className="bg-card-bg border border-card-border rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-card-border">
                <h2 className="text-sm font-bold text-navy uppercase tracking-widest">
                  Contract Awards
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate uppercase tracking-wider">
                      <th className="px-5 py-3">Agency</th>
                      <th className="px-5 py-3">Awardee</th>
                      <th className="px-5 py-3 text-right">Value</th>
                      <th className="px-5 py-3">Vehicle</th>
                      <th className="px-5 py-3">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border">
                    {brief.awards.map((award, i) => (
                      <tr key={i} className="hover:bg-panel-bg/50 transition-colors">
                        <td className="px-5 py-3 font-medium">
                          {award.agency}
                        </td>
                        <td className="px-5 py-3">{award.awardee}</td>
                        <td className="px-5 py-3 text-right font-mono font-semibold text-navy">
                          {formatCurrency(award.value)}
                        </td>
                        <td className="px-5 py-3 text-slate">{award.vehicle}</td>
                        <td className="px-5 py-3">
                          <a
                            href={award.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-navy-light hover:underline"
                          >
                            View ↗
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Opportunities */}
            <section className="bg-card-bg border border-card-border rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-card-border">
                <h2 className="text-sm font-bold text-navy uppercase tracking-widest">
                  Upcoming Solicitations
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate uppercase tracking-wider">
                      <th className="px-5 py-3">Agency</th>
                      <th className="px-5 py-3">Title</th>
                      <th className="px-5 py-3">NAICS</th>
                      <th className="px-5 py-3">Set-Aside</th>
                      <th className="px-5 py-3">Response Date</th>
                      <th className="px-5 py-3">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border">
                    {brief.opportunities.map((opp, i) => (
                      <tr key={i} className="hover:bg-panel-bg/50 transition-colors">
                        <td className="px-5 py-3 font-medium">{opp.agency}</td>
                        <td className="px-5 py-3 max-w-xs truncate">
                          {opp.title}
                        </td>
                        <td className="px-5 py-3 font-mono text-xs">
                          {opp.naicsCode}
                        </td>
                        <td className="px-5 py-3">
                          {opp.setAside && (
                            <span className="text-xs bg-accent-green/10 text-accent-green font-medium px-2 py-0.5 rounded">
                              {opp.setAside}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-slate whitespace-nowrap">
                          {opp.responseDate}
                        </td>
                        <td className="px-5 py-3">
                          <a
                            href={opp.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-navy-light hover:underline"
                          >
                            View ↗
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Recompetes */}
            {brief.recompetes.length > 0 && (
              <section className="bg-card-bg border border-accent-amber/30 rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-accent-amber/20 bg-accent-amber/5">
                  <h2 className="text-sm font-bold text-accent-amber uppercase tracking-widest">
                    Recompete Alerts
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate uppercase tracking-wider">
                        <th className="px-5 py-3">Agency</th>
                        <th className="px-5 py-3">Incumbent</th>
                        <th className="px-5 py-3 text-right">Est. Value</th>
                        <th className="px-5 py-3">Expiration</th>
                        <th className="px-5 py-3">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-card-border">
                      {brief.recompetes.map((rc, i) => (
                        <tr key={i} className="hover:bg-panel-bg/50 transition-colors">
                          <td className="px-5 py-3 font-medium">{rc.agency}</td>
                          <td className="px-5 py-3">{rc.incumbent}</td>
                          <td className="px-5 py-3 text-right font-mono font-semibold text-accent-amber">
                            {formatCurrency(rc.estimatedValue)}
                          </td>
                          <td className="px-5 py-3 text-slate">
                            {rc.expirationDate}
                          </td>
                          <td className="px-5 py-3">
                            <a
                              href={rc.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-navy-light hover:underline"
                            >
                              View ↗
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* All Stories */}
            <section>
              <h2 className="text-sm font-bold text-navy uppercase tracking-widest mb-4">
                Intelligence Feed
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sortedStories.map((story) => (
                  <StoryCard
                    key={story.id}
                    story={story}
                    stories={brief.stories}
                  />
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Budget Signals */}
            <section className="bg-card-bg border border-card-border rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-card-border">
                <h2 className="text-sm font-bold text-accent-purple uppercase tracking-widest">
                  Budget Signals
                </h2>
              </div>
              <div className="p-5">
                <p className="text-sm text-foreground/85 leading-relaxed">
                  {brief.budgetSignals}
                </p>
              </div>
            </section>

            {/* Trends */}
            <section className="bg-card-bg border border-card-border rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-card-border">
                <h2 className="text-sm font-bold text-navy uppercase tracking-widest">
                  Weekly Trends
                </h2>
              </div>
              <div className="p-5">
                <p className="text-sm text-foreground/85 leading-relaxed">
                  {brief.trends}
                </p>
              </div>
            </section>

            {/* Quick Stats */}
            <section className="bg-card-bg border border-card-border rounded-lg p-5 space-y-3">
              <h2 className="text-sm font-bold text-navy uppercase tracking-widest">
                Today&apos;s Numbers
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-panel-bg rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-navy">
                    {brief.stories.length}
                  </div>
                  <div className="text-xs text-slate">Stories</div>
                </div>
                <div className="bg-panel-bg rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-navy">
                    {brief.awards.length}
                  </div>
                  <div className="text-xs text-slate">Awards</div>
                </div>
                <div className="bg-panel-bg rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-accent-green">
                    {brief.opportunities.length}
                  </div>
                  <div className="text-xs text-slate">Solicitations</div>
                </div>
                <div className="bg-panel-bg rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-accent-amber">
                    {brief.recompetes.length}
                  </div>
                  <div className="text-xs text-slate">Recompetes</div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <ChatDrawer />
    </div>
  );
}
