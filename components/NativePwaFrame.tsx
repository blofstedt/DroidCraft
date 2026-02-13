
import React, { useEffect, useRef } from 'react';
import { UIElementRef } from '../types';

interface Props {
  html: string;
  js: string;
  highlightId?: string | null;
  onInteract: (element: UIElementRef, event: any) => void;
}

const NativePwaFrame: React.FC<Props> = ({ html, js, highlightId, onInteract }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current) return;

    const highlightStyle = `
      <style>
        .studio-highlight-active {
          outline: 4px solid #3b82f6 !important;
          outline-offset: -4px !important;
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.5) !important;
          transition: all 0.2s ease-in-out !important;
          position: relative !important;
          z-index: 9999 !important;
        }
        .studio-highlight-active::after {
          content: 'TARGETED';
          position: absolute;
          top: -20px;
          right: 0;
          background: #3b82f6;
          color: white;
          font-size: 8px;
          font-weight: 900;
          padding: 2px 6px;
          border-radius: 4px;
          pointer-events: none;
        }
      </style>
    `;

    const bridgeScript = `
      <script>
        window.addEventListener('message', (e) => {
          if (e.data.type === 'SET_HIGHLIGHT') {
            document.querySelectorAll('.studio-highlight-active').forEach(el => {
              el.classList.remove('studio-highlight-active');
            });
            if (e.data.id) {
              const target = document.getElementById(e.data.id) || document.querySelector('.' + e.data.id);
              if (target) {
                target.classList.add('studio-highlight-active');
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }
          }
        });

        document.addEventListener('click', (e) => {
          if (e.altKey || e.ctrlKey || e.metaKey) {
            e.preventDefault();
            e.stopPropagation();
            
            const el = e.target;
            const b = el.getBoundingClientRect();
            
            const data = {
              id: el.id || 'unnamed-' + Math.floor(Math.random() * 1000),
              tagName: el.tagName,
              text: el.innerText?.substring(0, 30),
              className: el.className,
              attributes: {},
              rect: {
                top: b.top,
                left: b.left,
                width: b.width,
                height: b.height
              }
            };
            
            for (let attr of el.attributes) {
              data.attributes[attr.name] = attr.value;
            }

            window.parent.postMessage({
              type: 'STUDIO_INTERACT',
              element: data,
              altKey: e.altKey,
              ctrlKey: e.ctrlKey || e.metaKey
            }, '*');
          }
        }, true);
      </script>
    `;

    const processedHtml = html
      .replace('</head>', `${highlightStyle}</head>`)
      .replace('<script src="app.js"></script>', `<script>${js}</script>${bridgeScript}`);
    
    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(processedHtml);
      doc.close();
    }
  }, [html, js]);

  // Handle live highlighting updates
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'SET_HIGHLIGHT',
        id: highlightId
      }, '*');
    }
  }, [highlightId]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'STUDIO_INTERACT') {
        onInteract(event.data.element, event.data);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onInteract]);

  return (
    <div className="w-[360px] h-[740px] bg-black rounded-[3.5rem] p-3 shadow-2xl relative border-[6px] border-slate-800 transition-transform duration-500 hover:scale-[1.01]">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-7 bg-slate-800 rounded-b-3xl z-30"></div>
      <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden relative">
        <iframe 
          ref={iframeRef}
          className="w-full h-full border-none"
          title="App Preview"
        />
      </div>
      <div className="absolute -right-1.5 top-24 w-1.5 h-12 bg-slate-800 rounded-l-md"></div>
      <div className="absolute -right-1.5 top-40 w-1.5 h-20 bg-slate-800 rounded-l-md"></div>
    </div>
  );
};

export default NativePwaFrame;
