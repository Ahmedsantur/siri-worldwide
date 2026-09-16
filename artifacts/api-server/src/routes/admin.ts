import { Router, type IRouter } from "express";
import { VerifyAdminBody, VerifyAdminResponse } from "@workspace/api-zod";

const router: IRouter = Router();

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

router.post("/admin/verify", (req, res) => {
  const parsed = VerifyAdminBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "An email address is required." });
    return;
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const authorized = Boolean(
    adminEmail && normalizeEmail(parsed.data.email) === normalizeEmail(adminEmail),
  );
  const data = VerifyAdminResponse.parse({
    authorized,
    message: authorized ? "Admin access granted." : "Access denied - Admin only",
  });

  res.json(data);
});

export default router;