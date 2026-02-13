
import React, { useEffect, useRef } from 'react';
import { UIElementRef } from '../types';

interface Props {
  html: string;
  js: string;
  mode: 'build' | 'test';
  highlightId?: string | null;
  onInteract: (element: UIElementRef, event: any) => void;
}

const NativePwaFrame: React.FC<Props> = ({ html, js, mode, highlightId, onInteract }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'STUDIO_INTERACT') {
        onInteract(event.data.element, event);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onInteract]);

  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'SET_MODE', mode }, '*');
    }
  }, [mode]);

  useEffect(() => {
    if (!iframeRef.current) return;

    const highlightStyle = `
      <style>
        .studio-highlight-active {
          outline: 3px solid #3b82f6 !important;
          outline-offset: -3px !important;
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.5) !important;
          transition: outline 0.1s ease !important;
          position: relative !important;
          z-index: 9998 !important;
        }
        body.build-mode * {
          cursor: crosshair !important;
          user-select: none !important;
          -webkit-user-drag: none !important;
        }
        body.build-mode a, body.build-mode button, body.build-mode input, body.build-mode textarea {
          pointer-events: none !important;
        }
      </style>
    `;

    const bridgeScript = `
      <script>
        let currentMode = '${mode}';
        
        window.addEventListener('message', (e) => {
          const findTarget = (id) => {
            return document.getElementById(id) || document.querySelector('.' + id) || document.querySelector(id);
          };

          if (e.data.type === 'SET_HIGHLIGHT') {
            document.querySelectorAll('.studio-highlight-active').forEach(el => el.classList.remove('studio-highlight-active'));
            if (e.data.id) {
              const target = findTarget(e.data.id);
              if (target) target.classList.add('studio-highlight-active');
            }
          }
          if (e.data.type === 'SET_MODE') {
            currentMode = e.data.mode;
            document.body.classList.toggle('build-mode', currentMode === 'build');
          }
          if (e.data.type === 'APPLY_STYLE') {
             const target = findTarget(e.data.id);
             if (target) Object.assign(target.style, e.data.style);
          }
          if (e.data.type === 'APPLY_TEXT') {
             const target = findTarget(e.data.id);
             if (target) target.innerText = e.data.text;
          }
          if (e.data.type === 'APPLY_LAYOUT') {
             const target = findTarget(e.data.id);
             if (target) {
                target.style.position = 'absolute';
                target.style.top = e.data.rect.top + 'px';
                target.style.left = e.data.rect.left + 'px';
                target.style.width = e.data.rect.width + 'px';
                target.style.height = e.data.rect.height + 'px';
                target.style.zIndex = '999';
             }
          }
        });

        document.addEventListener('click', (e) => {
          if (currentMode === 'build') {
            e.preventDefault();
            e.stopPropagation();
            
            const el = e.target;
            const b = el.getBoundingClientRect();
            const styles = window.getComputedStyle(el);
            
            const data = {
              id: el.id || el.className.split(' ')[0] || el.tagName.toLowerCase() + '-' + Math.random().toString(36).substr(2, 5),
              tagName: el.tagName,
              text: el.innerText?.substring(0, 100),
              className: el.className,
              rect: { top: b.top, left: b.left, width: b.width, height: b.height },
              computedStyles: {
                backgroundColor: styles.backgroundColor,
                color: styles.color,
                borderRadius: styles.borderRadius,
                boxShadow: styles.boxShadow,
                fontSize: styles.fontSize,
                padding: styles.padding,
                margin: styles.margin,
                display: styles.display,
                flexDirection: styles.flexDirection
              }
            };
            
            window.parent.postMessage({ type: 'STUDIO_INTERACT', element: data }, '*');
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

  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'SET_HIGHLIGHT', id: highlightId }, '*');
    }
  }, [highlightId]);

  return (
    <div className="w-[360px] h-[740px] bg-[#000] rounded-[3.5rem] p-3 shadow-2xl relative border-[6px] border-[#222]">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-[#222] rounded-b-2xl z-30"></div>
      <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden relative">
        <iframe ref={iframeRef} className="w-full h-full border-none" title="App Preview" />
      </div>
      <div className="absolute -right-1.5 top-24 w-1.5 h-10 bg-[#222] rounded-l-md"></div>
      <div className="absolute -right-1.5 top-36 w-1.5 h-20 bg-[#222] rounded-l-md"></div>
    </div>
  );
};

export default NativePwaFrame;
