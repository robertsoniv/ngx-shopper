import {
  Component,
  OnInit,
  Input,
  ViewChild,
  Output,
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
  selector: 'checkout-shipping',
  templateUrl: './checkout-shipping.component.html',
  styleUrls: ['./checkout-shipping.component.scss'],
})
export class CheckoutShippingComponent implements OnInit {
  @Input() isAnon: boolean;
  @Output() continue = new EventEmitter();
  @ViewChild(AddressFormComponent) addressFormComponent: AddressFormComponent;
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
    this.modalID = `checkout-select-address-shipping`;
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
    const filters = {
      Shipping: 'true',
    };
    this.ocMeService
      .ListAddresses({
        filters,
        ...this.requestOptions,
        pageSize: this.resultsPerPage,
      })
      .subscribe((addressList) => (this.existingAddresses = addressList));
  }

  private setSelectedAddress() {
    this.order = this.appStateService.orderSubject.value;
    this.lineItems = this.appStateService.lineItemSubject.value;
    this.selectedAddress = this.lineItems.Items[0].ShippingAddress; // shipping address is defined at the line item level
  }

  existingAddressSelected(address: BuyerAddress) {
    this.selectedAddress = address;
    this.modalService.close(this.modalID);
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
        this.lineItems.Items[0].ShippingAddress = address;
        this.appStateService.lineItemSubject.next(this.lineItems);
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
    // However, order.ShippingAddressID still points to the unmodified address. The ID should be cleared.
    address.ID = null;
    return this.ocOrderService.SetShippingAddress(
      'outgoing',
      this.order.ID,
      address
    );
  }

  private setSavedAddress(address): Observable<Order> {
    const partialOrder = {
      ShippingAddressID: address.ID,
    };
    return this.ocOrderService.Patch('outgoing', this.order.ID, partialOrder);
  }
}
