/**
 * SpinnerWheel - animated motorcycle on twisty road
 * Shows a detailed motorcycle leaning through curves with animated motion
 */
export function SpinnerWheel() {
  return (
    <div className="relative w-24 h-24" role="status" aria-label="Loading">
      <svg
        viewBox="0 0 140 140"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="w-full h-full"
      >
        {/* Animated twisty road path */}
        <path
          d="M 10 70 Q 35 40, 70 70 T 130 70"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-primary/20"
          strokeDasharray="8,6"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="0"
            to="14"
            dur="0.6s"
            repeatCount="indefinite"
          />
        </path>
        
        {/* Motorcycle group - animated along path */}
        <g className="text-primary">
          {/* Animate motorcycle moving and tilting */}
          <animateTransform
            attributeName="transform"
            type="translate"
            values="10,70; 40,52; 70,70; 100,52; 130,70; 10,70"
            dur="4s"
            repeatCount="indefinite"
          />
          
          {/* Rear wheel with spokes */}
          <g>
            <circle cx="0" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <circle cx="0" cy="12" r="6" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-60" />
            {/* Spokes */}
            <line x1="0" y1="3" x2="0" y2="21" stroke="currentColor" strokeWidth="0.8" className="opacity-40" />
            <line x1="-9" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="0.8" className="opacity-40" />
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 0 12"
              to="360 0 12"
              dur="0.8s"
              repeatCount="indefinite"
            />
          </g>
          
          {/* Front wheel with spokes */}
          <g>
            <circle cx="28" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <circle cx="28" cy="12" r="6" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-60" />
            {/* Spokes */}
            <line x1="28" y1="3" x2="28" y2="21" stroke="currentColor" strokeWidth="0.8" className="opacity-40" />
            <line x1="19" y1="12" x2="37" y2="12" stroke="currentColor" strokeWidth="0.8" className="opacity-40" />
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 28 12"
              to="360 28 12"
              dur="0.8s"
              repeatCount="indefinite"
            />
          </g>
          
          {/* Motorcycle frame and body */}
          <g strokeLinecap="round" strokeLinejoin="round">
            {/* Rear suspension/swingarm */}
            <path
              d="M 0 12 L 4 8"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            
            {/* Main frame */}
            <path
              d="M 4 8 L 10 2 L 18 2 L 24 6"
              stroke="currentColor"
              strokeWidth="2.5"
              fill="none"
            />
            
            {/* Fuel tank */}
            <ellipse
              cx="12"
              cy="3"
              rx="5"
              ry="3"
              fill="currentColor"
              className="opacity-80"
            />
            
            {/* Seat */}
            <path
              d="M 8 4 Q 10 2, 14 2 Q 16 2, 16 4 L 14 6 L 10 6 Z"
              fill="currentColor"
              className="opacity-70"
            />
            
            {/* Front fork */}
            <path
              d="M 18 2 L 28 12"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            
            {/* Handlebars */}
            <path
              d="M 16 0 L 20 0"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            
            {/* Exhaust */}
            <path
              d="M 2 10 L 8 10 Q 10 10, 10 8"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              className="opacity-60"
            />
          </g>
          
          {/* Rider - more prominent */}
          <g>
            {/* Helmet - larger and more visible */}
            <circle cx="12" cy="-4" r="4" fill="currentColor" />
            <ellipse cx="13.5" cy="-4" rx="2" ry="1.5" fill="currentColor" className="opacity-30" />
            
            {/* Neck */}
            <rect x="11" y="0" width="2" height="2" fill="currentColor" />
            
            {/* Body/Torso - thicker and more defined */}
            <path
              d="M 12 2 L 12 8"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            
            {/* Shoulders and arms reaching to handlebars */}
            <path
              d="M 8 3 L 12 3 L 16 3 L 18 1"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Legs on foot pegs - more defined */}
            <path
              d="M 12 8 L 10 11 L 9 13 M 12 8 L 14 11 L 15 13"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Back detail for depth */}
            <path
              d="M 10 4 Q 12 6, 14 4"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              className="opacity-50"
            />
          </g>
          
          {/* Lean animation */}
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="0,14,12; -18,14,12; 0,14,12; 18,14,12; 0,14,12"
            dur="4s"
            repeatCount="indefinite"
            additive="sum"
          />
        </g>
        
        {/* Speed lines for motion effect */}
        <g className="text-primary/30">
          <line x1="0" y1="62" x2="20" y2="62" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <animate attributeName="x1" values="0;40;0" dur="1s" repeatCount="indefinite" />
            <animate attributeName="x2" values="20;60;20" dur="1s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3;0.6;0.3" dur="1s" repeatCount="indefinite" />
          </line>
          <line x1="5" y1="68" x2="25" y2="68" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <animate attributeName="x1" values="5;45;5" dur="1.3s" repeatCount="indefinite" />
            <animate attributeName="x2" values="25;65;25" dur="1.3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.2;0.5;0.2" dur="1.3s" repeatCount="indefinite" />
          </line>
          <line x1="8" y1="75" x2="23" y2="75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <animate attributeName="x1" values="8;38;8" dur="1.1s" repeatCount="indefinite" />
            <animate attributeName="x2" values="23;53;23" dur="1.1s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.2;0.4;0.2" dur="1.1s" repeatCount="indefinite" />
          </line>
        </g>
      </svg>
      <span className="sr-only">Generating itinerary...</span>
    </div>
  );
}

