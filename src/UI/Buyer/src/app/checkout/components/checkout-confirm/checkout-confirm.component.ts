import {
  Component,
  OnInit,
  Inject,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { AppStateService, AppLineItemService } from '@app-buyer/shared';
import {
  Order,
  ListPayment,
  ListLineItem,
  OcOrderService,
} from '@ordercloud/angular-sdk';
import { Observable } from 'rxjs';
import { AppPaymentService } from '@app-buyer/shared/services/app-payment-service/app-payment.service';
import { FormGroup, FormBuilder } from '@angular/forms';
import {
  applicationConfiguration,
  AppConfig,
} from '@app-buyer/config/app.config';

@Component({
  selector: 'checkout-confirm',
  templateUrl: './checkout-confirm.component.html',
  styleUrls: ['./checkout-confirm.component.scss'],
})
export class CheckoutConfirmComponent implements OnInit {
  form: FormGroup;
  order: Order;
  payments$: Observable<ListPayment>;
  lineItems$: Observable<ListLineItem>;
  @Input() isSubmittingOrder: boolean;
  @Output() continue = new EventEmitter();

  constructor(
    private appStateService: AppStateService,
    private appPaymentService: AppPaymentService,
    private appLineItemService: AppLineItemService,
    private formBuilder: FormBuilder,
    private ocOrderService: OcOrderService,
    @Inject(applicationConfiguration) private appConfig: AppConfig
  ) {}

  ngOnInit() {
    if (!this.appConfig.anonymousShoppingEnabled) {
      this.form = this.formBuilder.group({ comments: '' });
    }
    this.order = this.appStateService.orderSubject.value;
    this.payments$ = this.appPaymentService.getPayments(
      'outgoing',
      this.order.ID
    );
    this.lineItems$ = this.appLineItemService.listAll(this.order.ID);
  }

  saveCommentsAndSubmitOrder() {
    if (this.isSubmittingOrder) {
      return;
    }
    this.isSubmittingOrder = true;
    this.ocOrderService
      .Patch('outgoing', this.order.ID, {
        Comments: this.form.get('comments').value,
      })
      .subscribe((order) => {
        this.appStateService.orderSubject.next(order);
        this.continue.emit();
      });
  }
}
