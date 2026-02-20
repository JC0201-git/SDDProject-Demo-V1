import React from 'react';
import { Badge as AntBadge, BadgeProps as AntBadgeProps } from 'antd';
import clsx from 'clsx';
import './Badge.css';

export interface BadgeProps extends AntBadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', className, ...rest }) => {
  const badgeClassName = clsx(
    'custom-badge',
    {
      [`custom-badge--${variant}`]: variant,
    },
    className
  );

  const statusMap: Record<string, AntBadgeProps['status']> = {
    success: 'success',
    warning: 'warning',
    error: 'error',
    info: 'processing',
    default: 'default',
  };

  return <AntBadge className={badgeClassName} status={statusMap[variant]} {...rest} />;
};
