"use client";

import { useEffect } from "react";
import { toast } from "react-hot-toast";

export default function VerificationEvents() {
  useEffect(() => {
    const eventSource = new EventSource(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/events`
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      console.log("Received event:", data);

      // toast.success(`${data.message}`, {
      //   position: "top-right",
      //   duration: 10000,
      // });
      toast.custom(
        (t) => (
          <div
            className={`${
              t.visible ? "animate-custom-enter" : "animate-custom-leave"
            } max-w-md w-full bg-white shadow-xl rounded-xl pointer-events-auto
     flex ring-1 ring-black ring-opacity-5`}
          >
            <div className="flex-1 p-4">
              <div className="flex items-start">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 leading-snug">
                    {data.message}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center border-l border-gray-200">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="px-4 h-full text-sm font-medium text-gray-500
                 hover:text-gray-700 transition-colors
                 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                ✕
              </button>
            </div>
          </div>
        ),
        {
          duration: 25000, // ⏱️ 25 seconds
          // position: "top-right",
        }
      );
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return null;
}
