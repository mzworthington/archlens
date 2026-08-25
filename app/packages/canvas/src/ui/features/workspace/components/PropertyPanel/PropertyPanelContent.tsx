import React from 'react';
import { PropertyPanelPropertiesMode } from './PropertyPanelPropertiesMode';
import type { PropertyPanelModel } from './usePropertyPanelModel';

export const PropertyPanelContent: React.FC<{ model: PropertyPanelModel }> = ({ model }) => (
  <div className="space-y-6">
    <PropertyPanelPropertiesMode model={model} />
  </div>
);
