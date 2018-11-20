import {
  Output,
  Component,
  OnInit,
  Input,
  ViewChild,
  EventEmitter,
} from '@angular/core';
import { Observable } from 'rxjs';
import {
  OcMeService,
  ListBuyerAddress,
  OcOrderService,
  Order,
  BuyerAddress,
  ListLineItem,
  Address,
} from '@ordercloud/angular-sdk';
import { AppStateService, ModalService } from '@app-buyer/shared';
import { filter } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { AddressFormComponent } from '@app-buyer/shared/components/address-form/address-form.component';

@Component({
  selector: 'checkout-billing',
  templateUrl: './checkout-billing.component.html',
  styleUrls: ['./checkout-billing.component.scss'],
})
export class CheckoutBillingComponent implements OnInit {
  @Input() isAnon: boolean;
  @ViewChild(AddressFormComponent) addressFormComponent: AddressFormComponent;
  @Output() continue = new EventEmitter();
  existingAddresses: ListBuyerAddress;
  selectedAddress: BuyerAddress;
  order: Order;
  lineItems: ListLineItem;
  resultsPerPage = 8;
  requestOptions: { page?: number; search?: string } = {
    page: undefined,
    search: undefined,
  };
  modalID: string;
  usingShippingAsBilling = false;

  constructor(
    private ocMeService: OcMeService,
    private ocOrderService: OcOrderService,
    private appStateService: AppStateService,
    private modalService: ModalService,
    private toastrService: ToastrService
  ) {}

  ngOnInit() {
    this.modalID = `checkout-select-address-billing`;
    this.clearFiltersOnModalClose();
    if (!this.isAnon) {
      this.getSavedAddresses();
    }
    this.setSelectedAddress();
  }

  clearFiltersOnModalClose() {
    this.modalService.onCloseSubject
      .pipe(filter((id) => id === this.modalID))
      .subscribe(() =>
        this.updateRequestOptions({ page: undefined, search: undefined })
      );
  }

  updateRequestOptions(options: { page?: number; search?: string }) {
    this.requestOptions = options;
    this.getSavedAddresses();
  }

  private getSavedAddresses() {
    this.ocMeService
      .ListAddresses({
        filters: { Billing: 'true' },
        ...this.requestOptions,
        pageSize: this.resultsPerPage,
      })
      .subscribe((addressList) => (this.existingAddresses = addressList));
  }

  private setSelectedAddress() {
    this.order = this.appStateService.orderSubject.value;
    this.lineItems = this.appStateService.lineItemSubject.value;
    this.selectedAddress = this.order.BillingAddress;
  }

  existingAddressSelected(address: BuyerAddress) {
    this.selectedAddress = address;
    this.modalService.close(this.modalID);
  }

  useShippingAsBilling() {
    this.usingShippingAsBilling = true;
    this.selectedAddress = this.lineItems.Items[0].ShippingAddress;
  }

  saveAddress(address: Address, formDirty: boolean) {
    let request = this.setSavedAddress(address);
    if (
      this.isAnon ||
      formDirty ||
      (this.usingShippingAsBilling && !this.order.ShippingAddressID) ||
      (!address.ID || address.ID === '') //If this is not a saved address. Fix for issue 287
    ) {
      request = this.setOneTimeAddress(address);
    }
    request.subscribe(
      (order) => {
        this.order = order;
        this.appStateService.orderSubject.next(this.order);
        this.continue.emit();
      },
      (ex) => {
        if (ex.error.Errors[0].ErrorCode === 'NotFound') {
          this.toastrService.error(
            'You no longer have access to this saved address. Please enter or select a different one.'
          );
        }
      }
    );
  }

  private setOneTimeAddress(address: BuyerAddress): Observable<Order> {
    // If a saved address (with an ID) is changed by the user it is attached to an order as a one time address.
    // However, order.ShippingAddressID (or BillingAddressID) still points to the unmodified address. The ID should be cleared.
    address.ID = null;
    return this.ocOrderService.SetBillingAddress(
      'outgoing',
      this.order.ID,
      address
    );
  }

  private setSavedAddress(address): Observable<Order> {
    const partialOrder = {
      BillingAddressID: address.ID,
    };
    return this.ocOrderService.Patch('outgoing', this.order.ID, partialOrder);
  }
}
