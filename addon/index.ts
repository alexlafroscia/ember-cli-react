import EmberComponent from '@ember/component';
import { get } from '@ember/object';
import { schedule } from '@ember/runloop';
import { getOwner } from '@ember/application';

import React, { Component as ReactComponent } from 'react';
import ReactDOM from 'react-dom';

import Constructor from './-private/constructor';
import YieldWrapper from './-private/yield-wrapper';
import grantOwnerAccess from './-private/grant-owner-access';
import componentIsFunctional from './-private/component-is-functional';

interface ComponentAttributes {
  [key: string]: any;
}

export default function WithEmberSupport<T extends Constructor<ReactComponent>>(
  Klass: T | React.SFC
): typeof EmberComponent {
  return class extends EmberComponent {
    /* Add type annotation for private `attrs` property on component */
    private attrs!: ComponentAttributes;

    private getPropsForReact(): ComponentAttributes {
      return Object.keys(this.attrs).reduce((acc: ComponentAttributes, key) => {
        const value = get(this, key as keyof this);

        acc[key] = value;

        return acc;
      }, {});
    }

    private mountElement() {
      const props = this.getPropsForReact();
      let { children } = props;

      if (!children) {
        const childNodes = this.element.childNodes;
        children = [
          React.createElement(YieldWrapper, {
            key: get(this, 'elementId'),
            nodes: [...childNodes]
          })
        ];
      }

      let KlassToRender;

      if (componentIsFunctional(Klass)) {
        KlassToRender = Klass;
      } else {
        const owner = getOwner(this);
        KlassToRender = grantOwnerAccess(Klass, owner);
      }

      ReactDOM.render(
        React.createElement(KlassToRender, props, children),
        this.element
      );
    }

    didUpdateAttrs() {
      schedule('render', () => this.mountElement());
    }

    didInsertElement() {
      super.didInsertElement();

      this.mountElement();
    }

    willDestroyElement() {
      ReactDOM.unmountComponentAtNode(this.element);

      super.willDestroyElement();
    }
  };
}
