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

## Fuse.js v7.0.0 (مستضاف ذاتياً)
- **المصدر:** حزمة npm الرسمية `fuse.js@7.0.0` (ملف `dist/fuse.mjs`)
- **الترخيص:** Apache-2.0 © Kiro Risk
- **SHA-384 (Integrity):** sha384-xZH1QJAP3pxvWYqB74MvWTHXRLEe+5oPmgoSe0mLQ7N0SmO2ZTIq3GBbJH+bMGYm
- **الحجم:** 41288 بايت
- **ملاحظة:** كان يُستورد من `https://esm.sh/fuse.js@7.0.0` — ووحدات ES لا تدعم SRI إطلاقاً
  (التحقق من التكامل خاصية لوسوم `<script>`/`<link>` فقط)، لذا الاستضافة الذاتية هي الطريقة الوحيدة لتأمينه.

## Font Awesome Free 6.5.1
- **المصدر:** https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css
- **الترخيص:** Icons: CC BY 4.0 | Fonts: SIL OFL 1.1 | Code: MIT
- **SRI (SHA-384):** sha384-t1nt8BQoYMLFN5p42tRAtuAAFQaCQODekUVeKKZrEnEyp4H2R0RHFz0KWpmj7i8g
- **ملاحظة:** cdnjs يرسل `access-control-allow-origin: *` (مُتحقَّق منه عملياً) لذا يعمل `crossorigin="anonymous"` + SRI.
  ملفات الخطوط (woff2) المشار إليها داخل CSS لا يمكن تطبيق SRI عليها (تحددها CSS لا وسم HTML).
