import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Micro-interaction components for delightful user experience

// Hover card with smooth elevation and glow effects
export const InteractiveCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}> = ({ children, className = "", onClick, disabled = false }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  return (
    <motion.div
      className={cn(
        "relative rounded-xl border bg-card p-6 transition-all duration-300 cursor-pointer",
        "hover:shadow-lg hover:shadow-blue-500/20 hover:border-blue-200",
        "active:scale-95 active:shadow-md",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      whileHover={{ 
        y: -4, 
        boxShadow: "0 20px 25px -5px rgba(59, 130, 246, 0.1), 0 10px 10px -5px rgba(59, 130, 246, 0.04)",
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onTapStart={() => setIsPressed(true)}
      onTapCancel={() => setIsPressed(false)}
      onTap={() => {
        setIsPressed(false);
        if (!disabled && onClick) onClick();
      }}
    >
      {/* Glow effect on hover */}
      <AnimatePresence>
        {isHovered && !disabled && (
          <motion.div
            className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 -z-10"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>
      
      {/* Ripple effect on click */}
      <AnimatePresence>
        {isPressed && !disabled && (
          <motion.div
            className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 -z-10"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>
      
      {children}
    </motion.div>
  );
};

// Animated button with loading states and success feedback
export const AnimatedButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
  success?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}> = ({ 
  children, 
  onClick, 
  loading = false, 
  success = false,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = ""
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const baseClasses = cn(
    "relative inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200",
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
    disabled && "opacity-50 cursor-not-allowed",
    className
  );

  const variantClasses = {
    primary: "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
    outline: "border-2 border-gray-300 text-gray-700 hover:border-gray-400"
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg"
  };

  return (
    <motion.button
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size])}
      whileHover={{ 
        scale: disabled ? 1 : 1.02,
        boxShadow: disabled ? "none" : "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
      }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={disabled ? undefined : onClick}
      disabled={disabled || loading}
    >
      {/* Button content */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            className="flex items-center gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Loading...</span>
          </motion.div>
        ) : success ? (
          <motion.div
            key="success"
            className="flex items-center gap-2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3, type: "spring" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Success!</span>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover glow effect */}
      <AnimatePresence>
        {isHovered && !disabled && !loading && !success && (
          <motion.div
            className="absolute inset-0 rounded-lg bg-white/10 -z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>
    </motion.button>
  );
};

// Animated badge with pulse effect for notifications
export const AnimatedBadge: React.FC<{
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'secondary';
  pulse?: boolean;
  className?: string;
}> = ({ children, variant = 'default', pulse = false, className = "" }) => {
  const variantClasses = {
    default: "bg-gray-100 text-gray-800",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    error: "bg-red-100 text-red-800",
    secondary: "bg-gray-200 text-gray-600"
  };

  return (
    <motion.span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        variantClasses[variant],
        className
      )}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      {children}
      
      {/* Pulse effect for notifications */}
      {pulse && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: 'currentColor', opacity: 0.3 }}
          animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.span>
  );
};

// Smooth number counter animation
export const AnimatedCounter: React.FC<{
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}> = ({ value, duration = 1.5, prefix = "", suffix = "", className = "" }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const endTime = startTime + duration * 1000;

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / (endTime - startTime), 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.floor(value * easeOutQuart);
      
      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, [value, duration]);

  return (
    <span className={className}>
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
};

// Skeleton loading animation
export const SkeletonLoader: React.FC<{
  className?: string;
  lines?: number;
  height?: string;
}> = ({ className = "", lines = 1, height = "h-4" }) => {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <motion.div
          key={i}
          className={cn(height, "bg-gray-200 rounded")}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.1,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
};

// Progress bar with smooth animation
export const AnimatedProgress: React.FC<{
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
  color?: 'blue' | 'green' | 'yellow' | 'red';
}> = ({ value, max = 100, className = "", showLabel = true, color = 'blue' }) => {
  const percentage = (value / max) * 100;
  
  const colorClasses = {
    blue: "bg-gradient-to-r from-blue-500 to-blue-600",
    green: "bg-gradient-to-r from-green-500 to-green-600",
    yellow: "bg-gradient-to-r from-yellow-500 to-yellow-600",
    red: "bg-gradient-to-r from-red-500 to-red-600"
  };

  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", colorClasses[color])}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
};

// Floating action button with smooth animations
export const FloatingActionButton: React.FC<{
  icon: React.ReactNode;
  onClick: () => void;
  label?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  className?: string;
}> = ({ icon, onClick, label, position = 'bottom-right', className = "" }) => {
  const [isHovered, setIsHovered] = useState(false);

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6'
  };

  return (
    <motion.div
      className={cn(
        "fixed z-50 flex items-center gap-3",
        positionClasses[position],
        className
      )}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      {/* Tooltip label */}
      <AnimatePresence>
        {isHovered && label && (
          <motion.div
            className="bg-gray-900 text-white px-3 py-1 rounded-lg text-sm whitespace-nowrap"
            initial={{ opacity: 0, x: position.includes('right') ? 10 : -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: position.includes('right') ? 10 : -10 }}
            transition={{ duration: 0.2 }}
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB button */}
      <motion.button
        className="w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-lg flex items-center justify-center text-white hover:shadow-xl"
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.95 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        onClick={onClick}
      >
        {icon}
      </motion.button>
    </motion.div>
  );
};

// Staggered list animation for items appearing
export const StaggeredList: React.FC<{
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}> = ({ children, className = "", staggerDelay = 0.1 }) => {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay
          }
        }
      }}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div
          key={index}
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 }
          }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};

// Page transition animation
export const PageTransition: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
};
