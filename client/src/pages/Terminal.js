import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/axios";
import { encryptMessage, decryptMessage } from "../utils/crypto";

const HELP_TEXT = `
  VAULT COMMANDS
    vault list              List all vaults
    vault info <VX-ID>      Show vault details
    vault open <VX-ID>      Open and decrypt a vault
    vault delete <VX-ID>    Delete a vault permanently
    vault create            Create a new vault (CLI or UI)

  SYSTEM COMMANDS
    activity                Show recent vault events
    whoami                  Show current user info
    status                  System status overview

  NAVIGATION
    dashboard               Switch to Command Center
    vaults                  Switch to Vault Archive
    settings                Switch to Settings
    mode                    Return to Mode Selector

  SESSION
    clear                   Clear terminal
    logout                  End session
    help                    Show this help
`;

const ALL_COMMANDS = [
  "help", "clear", "logout", "whoami", "activity", "status", "mode",
  "dashboard", "vaults", "settings",
  "vault list", "vault info", "vault open", "vault delete", "vault create",
];

function Terminal() {
  const navigate = useNavigate();
  const [lines, setLines] = useState([
    { type: "ascii", text: "  ╦  ╦╔═╗╦ ╦╦ ╔╦╗╔═╗╔═╗╦═╗╔═╗" },
    { type: "ascii", text: "  ╚╗╔╝╠═╣║ ║║  ║ ╔═╝║╣ ╠╦╝║ ║" },
    { type: "ascii", text: "   ╚╝ ╩ ╩╚═╝╩═╝╩ ╚═╝╚═╝╩╚═╚═╝" },
    { type: "system", text: "" },
    { type: "system", text: '  Secure Terminal v2.0 — Type "help" for commands' },
    { type: "system", text: "" },
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [processing, setProcessing] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const [prompt, setPrompt] = useState(null); // interactive prompt state
  const inputRef = useRef(null);
  const bottomRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [lines, scrollToBottom]);
  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { if (!processing) inputRef.current?.focus(); }, [processing, prompt, lines]);

  // Autocomplete suggestion
  useEffect(() => {
    if (!input.trim()) { setSuggestion(""); return; }
    const lower = input.toLowerCase();
    const match = ALL_COMMANDS.find(c => c.startsWith(lower) && c !== lower);
    setSuggestion(match ? match.slice(input.length) : "");
  }, [input]);

  const addLine = useCallback((type, text) => {
    setLines(prev => [...prev, { type, text }]);
  }, []);

  const addLines = useCallback((type, texts) => {
    setLines(prev => [...prev, ...texts.map(t => ({ type, text: t }))]);
  }, []);

  // Interactive prompt handler
  const handlePromptInput = useCallback(async (value) => {
    if (!prompt) return;
    const { step, data } = prompt;

    if (step === "create_mode") {
      addLine("input", `❯ ${value}`);
      if (value === "1") {
        setPrompt({ step: "create_type", data: {} });
        addLines("system", [
          "",
          "  Choose vault type:",
          "    1) eternal",
          "    2) destroy",
          "    3) release",
          "",
        ]);
      } else if (value === "2") {
        setPrompt(null);
        addLine("system", "  Opening graphical vault creator...");
        setTimeout(() => navigate("/vaults?create=true"), 500);
      } else {
        addLine("error", "  Invalid option. Enter 1 or 2.");
      }
    }

    else if (step === "create_type") {
      addLine("input", `❯ ${value}`);
      const typeMap = { "1": "eternal", "2": "destroy", "3": "release" };
      const vaultType = typeMap[value];
      if (!vaultType) {
        addLine("error", "  Invalid option. Enter 1, 2, or 3.");
        return;
      }
      setPrompt({ step: "create_message", data: { vaultType } });
      addLine("system", "  Enter vault message:");
    }

    else if (step === "create_message") {
      addLine("input", `❯ ${value}`);
      if (!value.trim()) {
        addLine("error", "  Message cannot be empty.");
        return;
      }
      setPrompt({ step: "create_passphrase", data: { ...data, message: value } });
      addLine("system", "  Enter passphrase:");
    }

    else if (step === "create_passphrase") {
      addLine("input", "❯ ••••••••");
      if (!value || value.length < 4) {
        addLine("error", "  Passphrase must be at least 4 characters.");
        return;
      }
      const newData = { ...data, passphrase: value };
      if (data.vaultType === "release") {
        setPrompt({ step: "create_trigger_days", data: newData });
        addLine("system", "  Enter trigger days (inactivity period):");
      } else {
        // Ready to create
        setPrompt(null);
        await createVaultFromTerminal(newData);
      }
    }

    else if (step === "create_trigger_days") {
      addLine("input", `❯ ${value}`);
      const days = parseInt(value);
      if (isNaN(days) || days < 1) {
        addLine("error", "  Enter a valid number of days (minimum 1).");
        return;
      }
      setPrompt({ step: "create_release_email", data: { ...data, triggerDays: days } });
      addLine("system", "  Enter release email (recipient):");
    }

    else if (step === "create_release_email") {
      addLine("input", `❯ ${value}`);
      if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        addLine("error", "  Enter a valid email address.");
        return;
      }
      setPrompt(null);
      await createVaultFromTerminal({ ...data, releaseEmail: value });
    }

    else if (step === "open_passphrase") {
      addLine("input", "❯ ••••••••");
      if (!value) {
        addLine("error", "  Passphrase cannot be empty.");
        return;
      }
      setPrompt(null);
      setProcessing(true);
      try {
        const { vaultData } = data;
        const decrypted = await decryptMessage(
          vaultData.encrypted_blob,
          vaultData.iv,
          vaultData.salt,
          value
        );

        // Check for VZMEDIA prefix (file vault)
        if (decrypted.startsWith("VZMEDIA:")) {
          const parts = decrypted.split(":");
          const mimeType = parts[1];
          const fileName = parts[2];
          addLines("output", [
            "",
            `  ┌─ DECRYPTED FILE ──────────────────┐`,
            `  │  File: ${fileName}`,
            `  │  Type: ${mimeType}`,
            `  │  Note: Use Vault Archive UI to download files.`,
            `  └────────────────────────────────────┘`,
            "",
          ]);
        } else {
          addLines("output", [
            "",
            "  ┌─ DECRYPTED CONTENT ────────────────┐",
            ...decrypted.split("\n").map(l => `  │  ${l}`),
            "  └──────────────────────────────────────┘",
            "",
          ]);
        }
      } catch {
        addLine("error", "  Decryption failed. Incorrect passphrase.");
      } finally {
        setProcessing(false);
      }
    }
  }, [prompt, addLine, addLines, navigate]);

  const createVaultFromTerminal = useCallback(async (data) => {
    setProcessing(true);
    addLine("system", "  Encrypting vault...");
    try {
      const encrypted = await encryptMessage(data.message, data.passphrase);
      const payload = {
        encryptedBlob: encrypted.encryptedBlob,
        iv: encrypted.iv,
        salt: encrypted.salt,
        vaultType: data.vaultType,
        triggerDays: data.triggerDays || null,
        releaseEmail: data.releaseEmail || null,
      };
      const res = await api.post("/api/vault/create", payload);
      addLines("output", [
        "",
        `  ✓ Vault created successfully.`,
        `  Type: ${data.vaultType}`,
        "",
      ]);
    } catch (err) {
      addLine("error", `  Failed to create vault: ${err.response?.data?.message || "Server error"}`);
    } finally {
      setProcessing(false);
    }
  }, [addLine, addLines]);

  const handleCommand = useCallback(async (cmd) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    addLine("input", `❯ ${trimmed}`);
    setHistory(prev => [...prev, trimmed]);
    setHistoryIdx(-1);
    setSuggestion("");

    const parts = trimmed.split(/\s+/);
    const command = parts[0].toLowerCase();

    const parseVaultId = (raw) => {
      if (!raw) return null;
      const cleaned = raw.replace(/^VX-/i, "");
      const num = parseInt(cleaned);
      return isNaN(num) ? null : num;
    };

    setProcessing(true);

    try {
      if (command === "help") {
        addLine("output", HELP_TEXT);
      }

      else if (command === "clear") {
        setLines([]);
      }

      else if (command === "logout") {
        addLine("system", "  Ending session...");
        setTimeout(() => {
          localStorage.clear();
          navigate("/", { replace: true });
        }, 500);
      }

      else if (command === "whoami") {
        try {
          const res = await api.get("/api/user/profile");
          addLines("output", [
            "",
            `  Email    ${res.data.email}`,
            `  ID       ${res.data.id}`,
            `  Login    ${res.data.last_login || "N/A"}`,
            "",
          ]);
        } catch {
          addLine("error", "  Failed to fetch user profile.");
        }
      }

      else if (command === "status") {
        try {
          const [vaultRes, profileRes] = await Promise.all([
            api.get("/api/vault/my-vaults"),
            api.get("/api/user/profile"),
          ]);
          const v = vaultRes.data;
          const active = v.filter(x => x.status === "active").length;
          const released = v.filter(x => x.status === "released").length;
          addLines("output", [
            "",
            "  ┌─ SYSTEM STATUS ─────────────────┐",
            `  │  Agent     ${profileRes.data.email}`,
            `  │  Vaults    ${v.length} total (${active} active, ${released} released)`,
            `  │  Eternal   ${v.filter(x => x.vault_type === "eternal").length}`,
            `  │  Release   ${v.filter(x => x.vault_type === "release").length}`,
            `  │  Destroy   ${v.filter(x => x.vault_type === "destroy").length}`,
            "  └────────────────────────────────────┘",
            "",
          ]);
        } catch {
          addLine("error", "  Failed to fetch system status.");
        }
      }

      else if (command === "activity") {
        try {
          const res = await api.get("/api/user/activity");
          if (res.data.length === 0) {
            addLine("output", "  No activity events found.");
          } else {
            addLine("output", "");
            res.data.slice(0, 15).forEach(e => {
              const ts = new Date(e.created_at).toLocaleString("en-US", {
                month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
              });
              addLine("output", `  ${e.event_type.toUpperCase().padEnd(16)} VX-${String(e.vault_id).padEnd(6)} ${ts}`);
            });
            addLine("output", "");
          }
        } catch {
          addLine("error", "  Failed to fetch activity.");
        }
      }

      // Navigation commands
      else if (command === "dashboard") {
        addLine("system", "  Switching to Command Center...");
        setTimeout(() => navigate("/dashboard"), 400);
      }
      else if (command === "vaults") {
        addLine("system", "  Switching to Vault Archive...");
        setTimeout(() => navigate("/vaults"), 400);
      }
      else if (command === "settings") {
        addLine("system", "  Opening Settings...");
        setTimeout(() => navigate("/settings"), 400);
      }
      else if (command === "mode") {
        addLine("system", "  Returning to Mode Selector...");
        localStorage.removeItem("vaultInterfaceMode");
        setTimeout(() => navigate("/mode-selector"), 400);
      }

      else if (command === "vault") {
        const subcommand = (parts[1] || "").toLowerCase();

        if (subcommand === "list") {
          try {
            const res = await api.get("/api/vault/my-vaults");
            if (res.data.length === 0) {
              addLine("output", "  No vaults found. Use 'vault create' to create one.");
            } else {
              addLine("output", "");
              addLine("output", "  ID         TYPE        STATUS      CREATED");
              addLine("output", "  " + "─".repeat(55));
              res.data.forEach(v => {
                addLine("output", `  VX-${String(v.id).padEnd(6)} ${v.vault_type.padEnd(11)} ${v.status.padEnd(11)} ${new Date(v.created_at).toLocaleDateString()}`);
              });
              addLine("output", "");
            }
          } catch {
            addLine("error", "  Failed to fetch vaults.");
          }
        }

        else if (subcommand === "info") {
          const id = parseVaultId(parts[2]);
          if (!id) {
            addLine("error", "  Usage: vault info <VX-ID>");
          } else {
            try {
              const res = await api.get("/api/vault/my-vaults");
              const vault = res.data.find(v => v.id === id);
              if (!vault) {
                addLine("error", `  Vault VX-${id} not found.`);
              } else {
                addLines("output", [
                  "",
                  `  ┌─ VAULT VX-${id} ───────────────────┐`,
                  `  │  Type       ${vault.vault_type}`,
                  `  │  Status     ${vault.status}`,
                  `  │  Created    ${new Date(vault.created_at).toLocaleString()}`,
                  vault.trigger_days ? `  │  Trigger    ${vault.trigger_days} days` : null,
                  vault.release_email ? `  │  Recipient  ${vault.release_email}` : null,
                  "  └────────────────────────────────────┘",
                  "",
                ].filter(Boolean));
              }
            } catch {
              addLine("error", `  Failed to fetch info for VX-${id}.`);
            }
          }
        }

        else if (subcommand === "open") {
          const id = parseVaultId(parts[2]);
          if (!id) {
            addLine("error", "  Usage: vault open <VX-ID>");
          } else {
            try {
              addLine("system", `  Accessing vault VX-${id}...`);
              const res = await api.post(`/api/vault/open/${id}`, {});
              addLines("output", [
                "",
                `  Vault VX-${id} accessed.`,
                `  Type: ${res.data.vault_type}  |  Status: ${res.data.status}`,
                "",
              ]);
              // Prompt for passphrase to decrypt
              setPrompt({ step: "open_passphrase", data: { vaultData: res.data } });
              addLine("system", "  Enter passphrase to decrypt:");
              setProcessing(false);
              return; // Don't reset processing — prompt takes over
            } catch (err) {
              addLine("error", `  ${err.response?.data?.message || `Failed to open VX-${id}.`}`);
            }
          }
        }

        else if (subcommand === "delete") {
          const id = parseVaultId(parts[2]);
          if (!id) {
            addLine("error", "  Usage: vault delete <VX-ID>");
          } else {
            addLine("system", `  Deleting VX-${id}...`);
            try {
              await api.delete(`/api/vault/${id}`);
              addLine("output", `  Vault VX-${id} permanently deleted.`);
            } catch (err) {
              addLine("error", `  ${err.response?.data?.message || `Failed to delete VX-${id}.`}`);
            }
          }
        }

        else if (subcommand === "create") {
          addLines("system", [
            "",
            "  Create vault using:",
            "    1) Terminal",
            "    2) Graphical UI",
            "",
          ]);
          setPrompt({ step: "create_mode", data: {} });
          setProcessing(false);
          return; // prompt takes over
        }

        else {
          addLine("error", `  Unknown vault subcommand: ${subcommand}`);
          addLine("system", "  Usage: vault [list|info|open|delete|create]");
        }
      }

      else {
        addLine("error", `  Command not found: ${command}`);
        // Suggest closest match
        const lower = command.toLowerCase();
        const close = ALL_COMMANDS.find(c => c.startsWith(lower.slice(0, 2)));
        if (close) {
          addLine("system", `  Did you mean: ${close}?`);
        } else {
          addLine("system", '  Type "help" for available commands.');
        }
      }
    } finally {
      setProcessing(false);
    }
  }, [addLine, addLines, navigate]);

  const handleKeyDown = (e) => {
    if (e.key === "Tab" && suggestion && !prompt) {
      e.preventDefault();
      setInput(prev => prev + suggestion);
      setSuggestion("");
    } else if (e.key === "Enter" && !processing) {
      if (prompt) {
        // Interactive prompt mode — feed input to prompt handler
        handlePromptInput(input);
        setInput("");
      } else {
        handleCommand(input);
        setInput("");
      }
    } else if (e.key === "ArrowUp" && !prompt) {
      e.preventDefault();
      if (history.length > 0) {
        const newIdx = historyIdx === -1 ? history.length - 1 : Math.max(0, historyIdx - 1);
        setHistoryIdx(newIdx);
        setInput(history[newIdx]);
      }
    } else if (e.key === "ArrowDown" && !prompt) {
      e.preventDefault();
      if (historyIdx === -1) return;
      const newIdx = historyIdx + 1;
      if (newIdx >= history.length) {
        setHistoryIdx(-1);
        setInput("");
      } else {
        setHistoryIdx(newIdx);
        setInput(history[newIdx]);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 flex flex-col bg-[#05070a]/80 overflow-hidden"
      >
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-borderSubtle bg-surface/50 flex-shrink-0">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
          </div>
          <span className="ml-2 text-xs text-gray-400 font-mono">vaultzero — secure terminal</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-gray-500 font-mono">CONNECTED</span>
          </div>
        </div>

        {/* Terminal body */}
        <div
          className="flex-1 p-4 overflow-y-auto font-mono text-[13px] leading-relaxed cursor-text"
          onClick={() => inputRef.current?.focus()}
        >
          {lines.map((line, i) => (
            <div key={i} className={`whitespace-pre-wrap ${
              line.type === "input" ? "text-emerald-400" :
              line.type === "error" ? "text-red-400" :
              line.type === "system" ? "text-indigo-400/60" :
              line.type === "ascii" ? "text-indigo-500/40" :
              "text-gray-400"
            }`}>
              {line.text}
            </div>
          ))}

          {/* Input line */}
          <div className="flex items-center gap-1.5 mt-1 relative">
            <span className={`flex-shrink-0 text-sm ${prompt ? "text-amber-400" : "text-emerald-500"}`}>
              {prompt ? "?" : "❯"}
            </span>
            <div className="relative flex-1">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => setTimeout(() => inputRef.current?.focus(), 0)}
                disabled={processing}
                type={prompt?.step === "create_passphrase" || prompt?.step === "open_passphrase" ? "password" : "text"}
                className={`w-full bg-transparent outline-none font-mono text-[13px] ${
                  prompt ? "text-amber-400 caret-amber-400" : "text-emerald-400 caret-emerald-400"
                }`}
                spellCheck={false}
                autoComplete="off"
                autoFocus
              />
              {suggestion && (
                <span className="absolute left-0 top-0 pointer-events-none text-[13px] font-mono">
                  <span className="invisible">{input}</span>
                  <span className="text-gray-500">{suggestion}</span>
                </span>
              )}
            </div>
            <span className="w-[7px] h-[18px] bg-emerald-400/80 animate-pulse flex-shrink-0" />
          </div>
          <div ref={bottomRef} />
        </div>
      </motion.div>
    </div>
  );
}

export default Terminal;
