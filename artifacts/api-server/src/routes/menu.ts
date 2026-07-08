import path from "node:path";
import { randomUUID } from "node:crypto";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { db } from "@workspace/db";
import { menuCategoriesTable, menuItemsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UPLOADS_DIR } from "../lib/uploads";
import { checkPin } from "../lib/ownerAuth";

const router = Router();

router.get("/menu/categories", async (req, res) => {
  try {
    const categories = await db
      .select()
      .from(menuCategoriesTable)
      .orderBy(menuCategoriesTable.sortOrder);
    res.json(categories);
  } catch (err) {
    req.log.error({ err }, "Failed to get menu categories");
    res.status(500).json({ error: "Failed to retrieve categories" });
  }
});

router.get("/menu/items", async (req, res) => {
  try {
    const category = req.query["category"] as string | undefined;
    let items;
    if (category) {
      items = await db
        .select()
        .from(menuItemsTable)
        .where(eq(menuItemsTable.category, category));
    } else {
      items = await db.select().from(menuItemsTable);
    }
    res.json(items);
  } catch (err) {
    req.log.error({ err }, "Failed to get menu items");
    res.status(500).json({ error: "Failed to retrieve menu items" });
  }
});

router.get("/menu/featured", async (req, res) => {
  try {
    const items = await db
      .select()
      .from(menuItemsTable)
      .where(eq(menuItemsTable.featured, true));
    res.json(items);
  } catch (err) {
    req.log.error({ err }, "Failed to get featured items");
    res.status(500).json({ error: "Failed to retrieve featured items" });
  }
});

/* ══ Owner — Menu photo upload (PIN protected) ══ */
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error("Only JPEG, PNG, or WEBP images are allowed"));
      return;
    }
    cb(null, true);
  },
});

const updateMenuItemSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  price: z.number().positive().optional(),
  category: z.string().min(1).optional(),
  available: z.boolean().optional(),
  featured: z.boolean().optional(),
});

router.patch("/owner/menu/items/:id", async (req, res): Promise<void> => {
  if (!(await checkPin(req.body?.pin))) {
    res.status(401).json({ error: "Invalid PIN" });
    return;
  }
  try {
    const { id } = req.params;
    const parsed = updateMenuItemSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid menu item data" });
      return;
    }
    const { name, description, price, category, available, featured } = parsed.data;
    if (
      name === undefined &&
      description === undefined &&
      price === undefined &&
      category === undefined &&
      available === undefined &&
      featured === undefined
    ) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const [existing] = await db
      .select()
      .from(menuItemsTable)
      .where(eq(menuItemsTable.id, id));

    if (!existing) {
      res.status(404).json({ error: "Menu item not found" });
      return;
    }

    const [updated] = await db
      .update(menuItemsTable)
      .set({
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price }),
        ...(category !== undefined && { category }),
        ...(available !== undefined && { available }),
        ...(featured !== undefined && { featured }),
      })
      .where(eq(menuItemsTable.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update menu item");
    res.status(500).json({ error: "Failed to update menu item" });
  }
});

router.post(
  "/owner/menu/items/:id/image",
  async (req, res, next) => {
    if (!(await checkPin(req.query.pin))) {
      res.status(401).json({ error: "Invalid PIN" });
      return;
    }
    next();
  },
  (req, res, next) => {
    upload.single("image")(req, res, (err) => {
      if (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : "Upload failed" });
        return;
      }
      next();
    });
  },
  async (req, res): Promise<void> => {
    try {
      const { id } = req.params;
      if (!req.file) {
        res.status(400).json({ error: "No image file provided" });
        return;
      }

      const [existing] = await db
        .select()
        .from(menuItemsTable)
        .where(eq(menuItemsTable.id, id));

      if (!existing) {
        res.status(404).json({ error: "Menu item not found" });
        return;
      }

      const imageUrl = `/api/uploads/menu/${req.file.filename}`;

      const [updated] = await db
        .update(menuItemsTable)
        .set({ imageUrl })
        .where(eq(menuItemsTable.id, id))
        .returning();

      res.json(updated);
    } catch (err) {
      req.log.error({ err }, "Failed to upload menu item image");
      res.status(500).json({ error: "Failed to upload image" });
    }
  },
);

export default router;
