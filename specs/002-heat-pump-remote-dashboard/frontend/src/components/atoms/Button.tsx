import React from 'react';
import { Button as AntButton, ButtonProps as AntButtonProps } from 'antd';
import clsx from 'clsx';
import './Button.css';

export interface ButtonProps extends Omit<AntButtonProps, 'variant'> {
  variant?: 'primary' | 'secondary' | 'danger' | 'text' | 'link';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  fullWidth = false,
  className,
  children,
  ...rest
}) => {
  const buttonType = variant === 'primary' ? 'primary' : variant === 'danger' ? 'primary' : 'default';
  const buttonClassName = clsx(
    'custom-button',
    {
      'custom-button--full-width': fullWidth,
      'custom-button--danger': variant === 'danger',
      'custom-button--secondary': variant === 'secondary',
    },
    className
  );

  return (
    <AntButton type={buttonType} className={buttonClassName} {...rest}>
      {children}
    </AntButton>
  );
};
