import React, { useEffect } from 'react';

export const AdSenseUnit: React.FC = () => {
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error("AdSense Error:", e);
    }
  }, []);

  return (
    <div className="my-8 text-center overflow-hidden ad-placement-wrapper">
      <span className="text-xs text-gray-400 block mb-2">إعلان</span>
      <ins className="adsbygoogle block"
           data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
           data-ad-slot="XXXXXXXXXX"
           data-ad-format="horizontal, rectangle"
           data-full-width-responsive="true"
           style={{ display: 'block' }}></ins>
    </div>
  );
};