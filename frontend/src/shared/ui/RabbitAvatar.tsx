'use client';

import React, { useState, useEffect } from 'react';
import { useRabbitQuickView } from '@/modules/rabbits/contexts/RabbitQuickViewContext';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface RabbitAvatarProps {
  imageUrl?: string | null;
  alt?: string;
  size?: AvatarSize;
  className?: string;
  ring?: boolean;
  rabbitId?: number | null;
  rabbitCode?: string | null;
  disableQuickView?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

const baseSizes: Record<AvatarSize, number> = {
  xs: 1.5,
  sm: 2.0,
  md: 2.75,
  lg: 3.5,
  xl: 4.25,
  '2xl': 5.0,
};

const maxSizes: Record<AvatarSize, number> = {
  xs: 2.5,
  sm: 3.25,
  md: 5.0,
  lg: 7.5,
  xl: 8.0,
  '2xl': 9.0,
};

export const RabbitAvatar: React.FC<RabbitAvatarProps> = ({
  imageUrl,
  alt = 'Conejo',
  size = 'md',
  className = '',
  ring = false,
  rabbitId,
  rabbitCode,
  disableQuickView = false,
  onClick,
}) => {
  const [hasError, setHasError] = useState(false);
  const quickView = useRabbitQuickView();

  useEffect(() => {
    setHasError(false);
  }, [imageUrl]);

  const remSize = baseSizes[size];
  const maxRemSize = maxSizes[size];
  const isSmallSize = size === 'xs' || size === 'sm';
  const sizeExpr = `min(calc(${remSize}rem * var(--avatar-scale, 1.25)), ${maxRemSize}rem)`;
  const radiusValue = isSmallSize
    ? 'var(--avatar-radius-sm, 9999px)'
    : 'var(--avatar-radius, 9999px)';

  const dimensionStyle: React.CSSProperties = {
    width: sizeExpr,
    height: sizeExpr,
    minWidth: sizeExpr,
    minHeight: sizeExpr,
    maxWidth: '100%',
    aspectRatio: '1 / 1',
    borderRadius: radiusValue,
  };

  const ringClasses = ring
    ? 'border-2 border-primary-100 dark:border-primary-900/30 ring-2 ring-offset-1 ring-primary-500/50'
    : 'border border-strong shadow-sm';

  const canTriggerQuickView = !disableQuickView && Boolean(onClick || (quickView && (rabbitId || rabbitCode)));
  const interactiveClasses = canTriggerQuickView
    ? 'group/avatar cursor-pointer pointer-events-auto relative z-20 hover:scale-105 hover:ring-2 hover:ring-primary-500 hover:shadow-md hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-primary-500'
    : 'hover:scale-105';

  const baseClasses = `flex-shrink-0 transition-all duration-200 ${ringClasses} ${interactiveClasses} ${className}`;

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick(e);
      return;
    }
    if (quickView && (rabbitId || rabbitCode)) {
      void quickView.openRabbitDetails({ rabbitId, rabbitCode });
    }
  };

  const textSizeClasses: Record<AvatarSize, string> = {
    xs: 'text-[7px]',
    sm: 'text-[8px]',
    md: 'text-[10px]',
    lg: 'text-xs',
    xl: 'text-sm',
    '2xl': 'text-base',
  };

  if (canTriggerQuickView) {
    return (
      <button
        type="button"
        onClick={handleAvatarClick}
        style={dimensionStyle}
        title="Ver detalles del conejo"
        aria-label={`Ver detalles de ${alt}`}
        className={`p-0 overflow-hidden bg-theme-surface flex items-center justify-center ${baseClasses}`}
      >
        {imageUrl && !hasError ? (
          <img
            src={imageUrl}
            alt={alt}
            className="w-full h-full object-cover rounded-[inherit] transition-transform duration-300 group-hover/avatar:scale-110"
            onError={() => setHasError(true)}
          />
        ) : (
          <span className={`text-center leading-tight px-0.5 text-theme-faint ${textSizeClasses[size]} font-medium uppercase`}>
            Sin foto
          </span>
        )}
      </button>
    );
  }

  if (imageUrl && !hasError) {
    return (
      <img
        src={imageUrl}
        alt={alt}
        style={dimensionStyle}
        className={`object-cover ${baseClasses}`}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div
      style={dimensionStyle}
      className={`bg-theme-surface flex items-center justify-center text-center leading-tight px-0.5 text-theme-faint ${textSizeClasses[size]} font-medium uppercase ${baseClasses}`}
    >
      Sin foto
    </div>
  );
};
