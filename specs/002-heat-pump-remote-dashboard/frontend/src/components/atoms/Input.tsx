import React from 'react';
import { Input as AntInput, InputProps as AntInputProps } from 'antd';
import clsx from 'clsx';
import './Input.css';

export interface InputProps extends AntInputProps {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  fullWidth = false,
  className,
  ...rest
}) => {
  const inputClassName = clsx(
    'custom-input',
    {
      'custom-input--full-width': fullWidth,
      'custom-input--error': error,
    },
    className
  );

  return (
    <div className="custom-input-wrapper">
      {label && <label className="custom-input-label">{label}</label>}
      <AntInput className={inputClassName} status={error ? 'error' : undefined} {...rest} />
      {error && <span className="custom-input-error">{error}</span>}
    </div>
  );
};

export const PasswordInput: React.FC<InputProps> = (props) => {
  return <AntInput.Password {...props} />;
};
