import { Router, type IRouter } from "express";
import { VerifyAdminBody, VerifyAdminResponse } from "@workspace/api-zod";

const router: IRouter = Router();
const EXAMPLE_ADMIN_PHONE = "+2547xxxxxxx";

function normalizePhone(phoneNumber: string) {
  return phoneNumber.replace(/[^\d+]/g, "");
}

router.post("/admin/verify", (req, res) => {
  const parsed = VerifyAdminBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A phone number is required." });
    return;
  }

  const adminPhone = process.env.ADMIN_PHONE?.trim() || EXAMPLE_ADMIN_PHONE;
  const authorized =
    normalizePhone(parsed.data.phoneNumber) === normalizePhone(adminPhone);
  const data = VerifyAdminResponse.parse({
    authorized,
    message: authorized ? "Admin access granted." : "Access denied - Admin only",
  });

  res.json(data);
});

export default router;