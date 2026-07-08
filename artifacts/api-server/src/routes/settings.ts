import { Router } from "express";
import { z } from "zod";
import { checkPin, setOwnerPin } from "../lib/ownerAuth";

const router = Router();

const changePinSchema = z.object({
  currentPin: z.string().min(1),
  newPin: z.string().min(4).max(64),
});

router.patch("/owner/settings/pin", async (req, res): Promise<void> => {
  const parsed = changePinSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "PIN baru minimal 4 karakter" });
    return;
  }
  const { currentPin, newPin } = parsed.data;

  if (!(await checkPin(currentPin))) {
    res.status(401).json({ error: "PIN saat ini salah" });
    return;
  }

  try {
    await setOwnerPin(newPin);
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to change owner PIN");
    res.status(500).json({ error: "Gagal mengganti PIN" });
  }
});

export default router;
