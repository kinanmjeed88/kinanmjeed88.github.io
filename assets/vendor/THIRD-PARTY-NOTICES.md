# إشعارات مكتبات الطرف الثالث

## Tailwind CSS — Play CDN build v3.4.17 (مستضاف ذاتياً)
- **المصدر الأصلي:** https://cdn.tailwindcss.com/3.4.17
- **الترخيص:** MIT © Tailwind Labs, Inc.
- **سبب الاستضافة الذاتية:** خادم cdn.tailwindcss.com لا يرسل ترويسة Access-Control-Allow-Origin،
  لذا لا يمكن استخدام Subresource Integrity (SRI) معه لأن المتصفح يمنع التحقق من التكامل
  للموارد عبر الأصل بدون CORS. الاستضافة الذاتية تُلغي الاعتماد على طرف ثالث وقت التشغيل.
- **SHA-384 (Integrity):** sha384-igm5BeiBt36UU4gqwWS7imYmelpTsZlQ45FZf+XBn9MuJbn4nQr7yx1yFydocC/K
- **SHA-256:** sha256-F26JRmGqnNyaXLpscgBEy797i9gNHJoUKnwksbbFDRU=
- **الحجم:** 407279 بايت
- **تاريخ الجلب:** 2026-10-02

## Lucide Icons v1.50.0
- **المصدر:** https://unpkg.com/lucide@1.50.0/dist/umd/lucide.min.js
- **الترخيص:** ISC © Lucide Contributors
- **SRI (SHA-384):** sha384-/sIySnlbVLfPSNdgy7yqanP6+Dv4en7FlBure4Rag0mp480bA2f+nTviC6933zkQ
- يُحمَّل من CDN مع integrity + crossorigin=anonymous (unpkg يرسل Access-Control-Allow-Origin: *).
