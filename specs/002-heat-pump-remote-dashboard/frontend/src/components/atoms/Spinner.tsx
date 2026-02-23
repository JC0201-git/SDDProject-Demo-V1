import React from 'react';
import { Spin, SpinProps } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import clsx from 'clsx';
import './Spinner.css';

export interface SpinnerProps extends SpinProps {
  fullScreen?: boolean;
}

export const Spinner: React.FC<SpinnerProps> = ({
  fullScreen = false,
  size = 'default',
  className,
  ...rest
}) => {
  const spinnerClassName = clsx('custom-spinner', className);
  const antIcon = <LoadingOutlined style={{ fontSize: size === 'large' ? 48 : 24 }} spin />;

  if (fullScreen) {
    return (
      <div className="custom-spinner-fullscreen">
        <Spin className={spinnerClassName} indicator={antIcon} size={size} {...rest} />
      </div>
    );
  }

  return <Spin className={spinnerClassName} indicator={antIcon} size={size} {...rest} />;
};
