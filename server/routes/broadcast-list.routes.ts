import { Express } from "express";
import {
  createBroadcastList,
  getBroadcastLists,
  getBroadcastListById,
  updateBroadcastList,
  deleteBroadcastList,
  addContactsToBroadcastList,
  removeContactsFromBroadcastList,
  getBroadcastListContactCount,
  deleteBroadcastListContacts,
} from "../controllers/broadcast-list.controller";
import { requireAuth } from "server/middlewares/auth.middleware";

export function registerBroadcastListRoutes(app: Express) {
  app.post("/api/broadcast-lists", requireAuth, createBroadcastList);
  app.get("/api/broadcast-lists", requireAuth, getBroadcastLists);
  app.get("/api/broadcast-lists/contact-counts", requireAuth, getBroadcastListContactCount);
  app.get("/api/broadcast-lists/:id", requireAuth, getBroadcastListById);
  app.put("/api/broadcast-lists/:id", requireAuth, updateBroadcastList);
  app.delete("/api/broadcast-lists/:id", requireAuth, deleteBroadcastList);
  app.delete("/api/broadcast-lists/:id/contacts", requireAuth, deleteBroadcastListContacts);
  app.post("/api/broadcast-lists/add-contacts", requireAuth, addContactsToBroadcastList);
  app.post("/api/broadcast-lists/remove-contacts", requireAuth, removeContactsFromBroadcastList);
}
