import { Component, Input } from '@angular/core';
import { Order, LineItem } from '@ordercloud/angular-sdk';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'checkout-order-summary',
  templateUrl: './order-summary.component.html',
  styleUrls: ['./order-summary.component.scss'],
})
export class OrderSummaryComponent {
  @Input() order: Order;
  @Input() lineItems: LineItem[];

  constructor() {}

  display(field) {
    if (!(this.order.xp && this.order.xp.AddOnsCalculated)) {
      return '-';
    }

    if (this.order[`${field}`] === 0) {
      return 'Free';
    }

    return new CurrencyPipe('en-US').transform(this.order[`${field}`]);
  }
}
