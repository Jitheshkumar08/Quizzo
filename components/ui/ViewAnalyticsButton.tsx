import React from 'react';

const ViewAnalyticsButton = () => {
  return (
    <div className="inline-flex rounded-full bg-white p-[2px] shadow-sm mx-auto">
      <div className="group/btn relative flex justify-center gap-2 items-center bg-white border border-white px-4 py-2 overflow-hidden rounded-full text-[15px] font-semibold text-gray-700 hover:text-white transition-colors duration-300 isolation-auto cursor-pointer">

        {/* Background sliding circle */}
        <div className="absolute z-0 aspect-square w-full rounded-full bg-[#3b82f6] transition-all duration-700 ease-out -left-full group-hover/btn:left-0 group-hover/btn:scale-150"></div>

        <span className="relative z-10">View Analytics</span>

        <svg
          className="relative z-10 w-7 h-7 justify-end rotate-45 rounded-full border border-white p-1.5 text-gray-700 transition-all duration-300 ease-linear group-hover/btn:rotate-90 group-hover/btn:bg-white group-hover/btn:text-gray-900 group-hover/btn:border-transparent"
          viewBox="0 0 16 19"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M7 18C7 18.5523 7.44772 19 8 19C8.55228 19 9 18.5523 9 18H7ZM8.70711 0.292893C8.31658 -0.0976311 7.68342 -0.0976311 7.29289 0.292893L0.928932 6.65685C0.538408 7.04738 0.538408 7.68054 0.928932 8.07107C1.31946 8.46159 1.95262 8.46159 2.34315 8.07107L8 2.41421L13.6569 8.07107C14.0474 8.46159 14.6805 8.46159 15.0711 8.07107C15.4616 7.68054 15.4616 7.04738 15.0711 6.65685L8.70711 0.292893ZM9 18L9 1H7L7 18H9Z"
            className="fill-current"
          />
        </svg>
      </div>
    </div>
  );
};

export default ViewAnalyticsButton;