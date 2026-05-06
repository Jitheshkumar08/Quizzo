import React from "react";

export const AiButtons = () => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 my-2">
      <style>{`
        .brutalist-button-openai {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 145px;
          height: 48px;
          background-color: #1c5749;
          text-decoration: none;
          border: 2px solid #000;
          padding: 0 10px;
          box-sizing: border-box;
          position: relative;
          box-shadow: 4px 4px 0 #000;
          overflow: hidden;
          transition: all 0.3s ease;
          border-radius: 6px;
        }
        .brutalist-button-openai::before {
          content: "";
          position: absolute;
          top: 0; left: -100%; width: 100%; height: 100%;
          background: linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: all 0.6s ease;
        }
        .brutalist-button-openai:hover::before { left: 100%; }
        .brutalist-button-openai:hover {
          background-color: #246d5b;
          transform: translate(-1px, -1px);
          box-shadow: 5px 5px 0 #000;
        }
        .brutalist-button-openai:active {
          transform: translate(2px, 2px);
          box-shadow: 2px 2px 0 #000;
        }
        @keyframes spin-and-zoom {
          0% { transform: rotate(0deg) scale(1.1); }
          100% { transform: rotate(360deg) scale(1.1); }
        }
        .brutalist-button-openai:hover .openai-icon {
          animation: spin-and-zoom 1.5s linear infinite;
        }
        .openai-logo { display: flex; align-items: center; margin-right: 8px; }
        .openai-icon { width: 22px; height: 22px; fill: #000; transition: all 0.3s ease; }
        
        .button-text-openai { display: flex; flex-direction: column; line-height: 1.1; align-items: flex-start; }
        .button-text-openai span:first-child { font-size: 9px; font-weight: 600; text-transform: uppercase; color: #a3ccbf; }
        .button-text-openai span:last-child { font-size: 16px; font-weight: 700; color: #ffffff; }

        .brutalist-button-claude {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 145px;
          height: 48px;
          background-color: #e3d19c;
          text-decoration: none;
          border: 2px solid #ffffff;
          outline: 2px solid #1a1a1a;
          box-shadow: 4px 4px 0 #ff6c37;
          transition: all 0.2s ease-out;
          padding: 0 10px;
          box-sizing: border-box;
          position: relative;
          overflow: hidden;
          border-radius: 6px;
        }
        .brutalist-button-claude::before {
          content: "";
          position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
          background: conic-gradient(from 0deg at 50% 50%, #ff6c37, #9a77ff, #ff6c37);
          opacity: 0; transition: opacity 0.3s ease-out; z-index: 1;
          animation: rotate 4s linear infinite;
        }
        @keyframes rotate { 100% { transform: rotate(360deg); } }
        .brutalist-button-claude:hover::before { opacity: 0.15; }
        .brutalist-button-claude:hover {
          transform: translate(-1px, -1px);
          box-shadow: 5px 5px 0 #ff6c37;
        }
        .brutalist-button-claude:active {
          transform: translate(2px, 2px);
          box-shadow: 1px 1px 0 #ff6c37;
          background-color: #ffffff;
          outline-color: #1a1a1a;
        }
        .claude-logo { display: flex; align-items: center; margin-right: 6px; position: relative; z-index: 2; }
        .starburst { font-size: 20px; color: #eb6c22; text-shadow: 1px 1px 0 #1a1a1a; transition: transform 0.2s ease-out; }
        .brutalist-button-claude:hover .starburst { transform: rotate(-15deg) scale(1.1); }
        .brutalist-button-claude:active .starburst { transform: rotate(15deg) scale(0.9); }
        
        .button-text-claude { display: flex; flex-direction: column; line-height: 1.1; align-items: flex-start; z-index: 2; }
        .button-text-claude span:first-child { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #89530e; opacity: 0.8; }
        .button-text-claude span:last-child { font-size: 17px; font-family: Georgia, serif; font-weight: normal; color: #89530e; }
      `}</style>
      <a href="https://chatgpt.com" target="_blank" rel="noopener noreferrer" className="brutalist-button-openai">
        <div className="openai-logo">
          <svg className="openai-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.5907 8.3829 14.6108 7.2144a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.3927-.6813zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" fill="#10A37F" />
          </svg>
        </div>
        <div className="button-text-openai">
          <span>Click to visit</span>
          <span>ChatGPT</span>
        </div>
      </a>
      <a href="https://claude.ai" target="_blank" rel="noopener noreferrer" className="brutalist-button-claude">
        <div className="claude-logo">
          <span className="starburst">✷</span>
        </div>
        <div className="button-text-claude">
          <span>Click to visit</span>
          <span>Claude</span>
        </div>
      </a>
    </div>
  );
};

