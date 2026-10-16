import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import fs from "fs";
import path from "path";

function devLeadsPlugin() {
  const dir = typeof import.meta.dirname !== "undefined" ? import.meta.dirname : process.cwd();
  const leadsFile = path.resolve(dir, "../.dev_leads.json");
  return {
    name: "dev-leads-sync",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");

        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          return res.end();
        }

        const urlParts = (req.url || "").split("?");
        const pathname = urlParts[0];

        if (pathname === "/api/leads") {
          if (req.method === "GET") {
            try {
              const data = fs.existsSync(leadsFile) ? fs.readFileSync(leadsFile, "utf-8") : "[]";
              res.setHeader("Content-Type", "application/json");
              return res.end(data || "[]");
            } catch {
              res.setHeader("Content-Type", "application/json");
              return res.end("[]");
            }
          }

          if (req.method === "POST") {
            let body = "";
            req.on("data", chunk => { body += chunk; });
            req.on("end", () => {
              try {
                const newLead = JSON.parse(body);
                let list = [];
                if (fs.existsSync(leadsFile)) {
                  list = JSON.parse(fs.readFileSync(leadsFile, "utf-8") || "[]");
                }
                list.unshift(newLead);
                fs.writeFileSync(leadsFile, JSON.stringify(list, null, 2));
                res.setHeader("Content-Type", "application/json");
                return res.end(JSON.stringify({ success: true, lead: newLead }));
              } catch (e) {
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");
                return res.end(JSON.stringify({ error: e.message }));
              }
            });
            return;
          }
        }

        if (pathname.startsWith("/api/leads/")) {
          const id = pathname.replace("/api/leads/", "");
          if (req.method === "PATCH") {
            let body = "";
            req.on("data", chunk => { body += chunk; });
            req.on("end", () => {
              try {
                const patch = JSON.parse(body);
                let list = [];
                if (fs.existsSync(leadsFile)) {
                  list = JSON.parse(fs.readFileSync(leadsFile, "utf-8") || "[]");
                }
                list = list.map(l => l.id === id ? { ...l, ...patch } : l);
                fs.writeFileSync(leadsFile, JSON.stringify(list, null, 2));
                res.setHeader("Content-Type", "application/json");
                return res.end(JSON.stringify({ success: true }));
              } catch (e) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: e.message }));
              }
            });
            return;
          }

          if (req.method === "DELETE") {
            try {
              let list = [];
              if (fs.existsSync(leadsFile)) {
                list = JSON.parse(fs.readFileSync(leadsFile, "utf-8") || "[]");
              }
              list = list.filter(l => l.id !== id);
              fs.writeFileSync(leadsFile, JSON.stringify(list, null, 2));
              res.setHeader("Content-Type", "application/json");
              return res.end(JSON.stringify({ success: true }));
            } catch (e) {
              res.statusCode = 400;
              return res.end(JSON.stringify({ error: e.message }));
            }
          }
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare(), devLeadsPlugin()],
  server: {
    host: true,
  },
});