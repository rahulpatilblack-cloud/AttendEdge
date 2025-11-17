import React from 'react';
import { Building2 } from 'lucide-react';
import { APP_NAME, APP_TAGLINE } from "../branding";

interface CompanyLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
}

const CompanyLogo: React.FC<CompanyLogoProps> = ({ 
  size = 'md', 
  className = '', 
  showText = false 
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className={`${sizeClasses[size]} flex items-center justify-center`}>
        <img 
          src="/attendedge-logo.png" 
          alt="AttendEdge Logo" 
          className="w-full h-full object-contain"
          onError={(e) => {
            // Fallback to icon if logo fails to load
            console.log('Logo failed to load, using fallback icon');
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
          onLoad={() => {
            console.log('Logo loaded successfully');
          }}
        />
        {/* Fallback 1: Gradient icon */}
        <div className={`${sizeClasses[size]} gradient-primary rounded-lg flex items-center justify-center hidden`}>
          <Building2 className={`${iconSizes[size]} text-white`} />
        </div>
        {/* Fallback 2: Simple text logo */}
        <div className={`${sizeClasses[size]} bg-blue-600 rounded-lg flex items-center justify-center hidden text-white font-bold text-xs`}>
          AE
        </div>
      </div>
      {showText && (
        <div>
          <h1 className="font-bold text-xl text-gray-900">{APP_NAME}</h1>
          <p className="text-sm text-gray-500">{APP_TAGLINE}</p>
        </div>
      )}
    </div>
  );
};

export default CompanyLogo; 