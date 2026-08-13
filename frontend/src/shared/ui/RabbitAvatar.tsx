import React from 'react';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface RabbitAvatarProps {
  imageUrl?: string | null;
  alt?: string;
  size?: AvatarSize;
  className?: string;
  ring?: boolean;
}

const baseSizes: Record<AvatarSize, number> = {
  xs: 1.5,   // w-6
  sm: 2.0,   // w-8
  md: 2.5,   // w-10
  lg: 3.0,   // w-12
  xl: 4.0,   // w-16
  '2xl': 5.0 // w-20
};

export const RabbitAvatar: React.FC<RabbitAvatarProps> = ({ 
  imageUrl, 
  alt = 'Conejo', 
  size = 'md', 
  className = '',
  ring = false
}) => {
  const remSize = baseSizes[size];
  
  // Usamos var(--avatar-scale, 1) que será controlado por Apariencia.
  // min-width y min-height aseguran que el flex no encoja el avatar.
  const dimensionStyle = {
    width: `calc(${remSize}rem * var(--avatar-scale, 1))`,
    height: `calc(${remSize}rem * var(--avatar-scale, 1))`,
    minWidth: `calc(${remSize}rem * var(--avatar-scale, 1))`,
    minHeight: `calc(${remSize}rem * var(--avatar-scale, 1))`
  };

  const ringClasses = ring 
    ? 'border-2 border-primary-100 dark:border-primary-900/30 ring-2 ring-offset-1 ring-primary-500/50' 
    : 'border border-strong shadow-sm';

  const baseClasses = `rounded-full flex-shrink-0 transition-transform duration-200 hover:scale-105 ${ringClasses} ${className}`;

  if (imageUrl) {
    return (
      <img 
        src={imageUrl} 
        alt={alt} 
        style={dimensionStyle} 
        className={`object-cover ${baseClasses}`} 
      />
    );
  }

  // Placeholder text sizing relative to the container
  const textSizeClasses = {
    xs: 'text-[7px]',
    sm: 'text-[8px]',
    md: 'text-[10px]',
    lg: 'text-xs',
    xl: 'text-sm',
    '2xl': 'text-base'
  };

  return (
    <div 
      style={dimensionStyle} 
      className={`bg-theme-surface flex items-center justify-center text-center leading-tight px-0.5 text-theme-faint ${textSizeClasses[size]} font-medium uppercase ${baseClasses}`}
    >
      Sin foto
    </div>
  );
};
