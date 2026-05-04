import React from "react";

export const SearchLoader = () => {
  return (
    <>
      <style>{`
        .search-loader-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .search-loader-container {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          width: 130px;
          height: fit-content;
        }
        .search-loader-bar-container {
          width: 100%;
          height: fit-content;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          gap: 10px;
          background-position: left;
        }
        .search-loader-bar {
          width: 100%;
          height: 8px;
          background: linear-gradient(
            to right,
            rgb(161, 94, 255),
            rgb(217, 190, 255),
            rgb(161, 94, 255)
          );
          background-size: 200% 100%;
          border-radius: 10px;
          animation: search-loader-bar-anim ease-in-out 3s infinite alternate-reverse;
        }
        .search-loader-bar2 {
          width: 50%;
        }
        .search-loader-svg {
          position: absolute;
          left: -25px;
          margin-top: 18px;
          z-index: 2;
          width: 70%;
          animation: search-loader-svg-anim ease-in-out 3s infinite alternate-reverse;
        }
        .search-loader-svg circle {
          fill: rgba(98, 65, 142, 0.238);
          stroke: rgb(162, 55, 255);
        }
        .search-loader-svg line {
          stroke: rgb(162, 55, 255);
        }
        @keyframes search-loader-bar-anim {
          0% {
            background-position: left;
          }
          100% {
            background-position: right;
          }
        }
        @keyframes search-loader-svg-anim {
          0% {
            transform: translateX(0%) rotate(70deg);
          }
          100% {
            transform: translateX(100px) rotate(10deg);
          }
        }
      `}</style>
      <div className="search-loader-wrapper">
        <div className="search-loader-container">
          <div className="search-loader-bar-container">
            <span className="search-loader-bar" />
            <span className="search-loader-bar search-loader-bar2" />
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 101 114"
            className="search-loader-svg"
          >
            <circle
              strokeWidth={7}
              transform="rotate(36.0692 46.1726 46.1727)"
              r="29.5497"
              cy="46.1727"
              cx="46.1726"
            />
            <line
              strokeWidth={7}
              y2="111.784"
              x2="97.7088"
              y1="67.7837"
              x1="61.7089"
            />
          </svg>
        </div>
      </div>
    </>
  );
};
