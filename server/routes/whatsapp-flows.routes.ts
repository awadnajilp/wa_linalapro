import { Express } from "express";
import { WhatsappFlowsController } from "../controllers/whatsapp-flows.controller";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";

export function registerWhatsappFlowsRoutes(app: Express) {
  // List all flows
  app.get("/api/whatsapp-flows", requireAuth, WhatsappFlowsController.getFlows);

  // Sync flows from Meta WABA
  app.post("/api/whatsapp-flows/sync", requireAuth, WhatsappFlowsController.syncMetaFlows);

  // Seed sample templates
  app.post("/api/whatsapp-flows/seed-samples", requireAuth, WhatsappFlowsController.seedSampleTemplates);

  // Send an interactive flow message
  app.post("/api/whatsapp-flows/send", requireAuth, WhatsappFlowsController.sendFlow);

  // Get single flow
  app.get("/api/whatsapp-flows/:id", requireAuth, WhatsappFlowsController.getFlowById);

  // Create new flow
  app.post("/api/whatsapp-flows", requireAuth, WhatsappFlowsController.createFlow);

  // Update flow
  app.put("/api/whatsapp-flows/:id", requireAuth, WhatsappFlowsController.updateFlow);

  // Publish flow to Meta
  app.post("/api/whatsapp-flows/:id/publish", requireAuth, WhatsappFlowsController.publishFlow);

  // Deprecate flow on Meta
  app.post("/api/whatsapp-flows/:id/deprecate", requireAuth, WhatsappFlowsController.deprecateFlow);

  // Delete flow
  app.delete("/api/whatsapp-flows/:id", requireAuth, WhatsappFlowsController.deleteFlow);

  // Get responses for flow
  app.get("/api/whatsapp-flows/:flowId/responses", requireAuth, WhatsappFlowsController.getFlowResponses);

  // Export responses to Excel
  app.get("/api/whatsapp-flows/:flowId/export", requireAuth, WhatsappFlowsController.exportFlowResponses);
}
