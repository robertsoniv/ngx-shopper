import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductListComponent } from '@app-buyer/products/containers/product-list/product-list.component';
import { PageTitleComponent, AppLineItemService } from '@app-buyer/shared';
import {
  NgbPaginationModule,
  NgbCollapseModule,
  NgbPaginationConfig,
} from '@ng-bootstrap/ng-bootstrap';
import { ReactiveFormsModule } from '@angular/forms';
import { of, BehaviorSubject } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { OcMeService } from '@ordercloud/angular-sdk';
import { QuantityInputComponent } from '@app-buyer/shared/components/quantity-input/quantity-input.component';
import { RouterTestingModule } from '@angular/router/testing';
import { CategoryNavComponent } from '@app-buyer/products/components/category-nav/category-nav.component';
import { TreeModule } from 'angular-tree-component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ToggleFavoriteComponent } from '@app-buyer/shared/components/toggle-favorite/toggle-favorite.component';
import { ProductCardComponent } from '@app-buyer/shared/components/product-card/product-card.component';
import { MapToIterablePipe } from '@app-buyer/shared/pipes/map-to-iterable/map-to-iterable.pipe';
import { FavoriteProductsService } from '@app-buyer/shared/services/favorites/favorites.service';

describe('ProductListComponent', () => {
  const mockProductData = of({ Items: [], Meta: {} });
  const mockQueryParams = { category: 'CategoryID' };
  const mockCategoryData = of({
    Items: [{ ID: 'CategoryID' }, { ID: 'category2' }],
    Meta: {},
  });
  const mockMe = of({ xp: { FavoriteProducts: [] } });

  let component: ProductListComponent;
  let fixture: ComponentFixture<ProductListComponent>;
  const queryParams = new BehaviorSubject<any>(mockQueryParams);
  const meService = {
    ListProducts: jasmine
      .createSpy('ListProducts')
      .and.returnValue(mockProductData),
    ListCategories: jasmine
      .createSpy('ListCategories')
      .and.returnValue(mockCategoryData),
    Get: jasmine.createSpy('Get').and.returnValue(mockMe),
    Patch: jasmine.createSpy('Patch').and.returnValue(mockMe),
  };
  const ocLineItemService = {
    create: jasmine.createSpy('create').and.returnValue(of(null)),
  };
  const favoriteProductsService = {
    loadFavorites: jasmine.createSpy('loadFavorites'),
  };

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        ProductListComponent,
        PageTitleComponent,
        ProductCardComponent,
        QuantityInputComponent,
        CategoryNavComponent,
        ToggleFavoriteComponent,
        MapToIterablePipe,
      ],
      imports: [
        NgbPaginationModule,
        NgbCollapseModule,
        ReactiveFormsModule,
        RouterTestingModule,
        TreeModule,
        FontAwesomeModule,
      ],
      providers: [
        NgbPaginationConfig,
        { provide: AppLineItemService, useValue: ocLineItemService },
        {
          provide: ActivatedRoute,
          useValue: { queryParams, snapshot: { queryParams: mockQueryParams } },
        },
        { provide: OcMeService, useValue: meService },
        { provide: FavoriteProductsService, useValue: favoriteProductsService },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ProductListComponent);
    component = fixture.componentInstance;
    component.categoryCrumbs = [];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    beforeEach(() => {
      spyOn(component, 'getProductData').and.returnValue(mockProductData);
      spyOn(component, 'configureRouter');
      spyOn(component, 'getCategories');
      spyOn(component['formBuilder'], 'group');
      component.ngOnInit();
    });
    it('should set productList$', () => {
      expect(component.getProductData).toHaveBeenCalled();
      expect(component.productList$).toBe(mockProductData);
    });
    it('should get categories', () => {
      expect(component.getCategories).toHaveBeenCalled();
    });
    it('should configure the router', () => {
      expect(component.configureRouter).toHaveBeenCalled();
    });
    it('should load favorites', () => {
      expect(favoriteProductsService.loadFavorites).toHaveBeenCalled();
    });
  });

  describe('getCategories', () => {
    beforeEach(() => {
      spyOn(component, 'buildBreadCrumbs');
      component.getCategories();
    });
    it('should list categories', () => {
      expect(meService.ListCategories).toHaveBeenCalledWith({ depth: 'all' });
    });
    it('should build breadcrumbs with categoryid from queryparam', () => {
      expect(component.buildBreadCrumbs).toHaveBeenCalledWith(
        component['activatedRoute'].snapshot.queryParams.category
      );
    });
  });

  describe('changePage', () => {
    const mockPage = 2;
    it('should reload state with page set as query params', () => {
      const navigateSpy = spyOn((<any>component).router, 'navigate');
      component.changePage(mockPage);
      queryParams.next({ mockQueryParams });
      const newQueryParams = Object.assign({ page: mockPage }, mockQueryParams);
      expect(navigateSpy).toHaveBeenCalledWith([], {
        queryParams: newQueryParams,
      });
    });
  });

  describe('changeCategory', () => {
    const mockCategory = 'category2';
    it('should reload state with category set as query params', () => {
      const navigateSpy = spyOn((<any>component).router, 'navigate');
      component.changeCategory(mockCategory);
      const newQueryParams = Object.assign({ category: mockCategory });
      queryParams.next({ newQueryParams });
      expect(navigateSpy).toHaveBeenCalledWith([], {
        queryParams: newQueryParams,
      });
    });
  });

  describe('sortStratChanged', () => {
    it('should reload state with no search', () => {
      const navigateSpy = spyOn((<any>component).router, 'navigate');
      const newSort = '!Name';
      component.sortForm.controls['sortBy'].setValue(newSort);
      component.sortStratChanged();
      const newQueryParams = Object.assign({}, mockQueryParams, {
        sortBy: newSort,
      });
      expect(navigateSpy).toHaveBeenCalledWith([], {
        queryParams: newQueryParams,
      });
    });
  });

  describe('sortStratChanged', () => {
    it('should reload state with no search', () => {
      const navigateSpy = spyOn((<any>component).router, 'navigate');
      const newSort = '!Name';
      component.sortForm.controls['sortBy'].setValue(newSort);
      component.sortStratChanged();
      const newQueryParams = Object.assign({}, mockQueryParams, {
        sortBy: newSort,
      });
      expect(navigateSpy).toHaveBeenCalledWith([], {
        queryParams: newQueryParams,
      });
    });

    describe('buildBreadCrumbs', () => {
      it('should return an empty array when id is null', () => {
        expect(component.buildBreadCrumbs(null)).toEqual([]);
      });
      it('should return an empty array when categories are null', () => {
        component.categories = null;
        expect(component.buildBreadCrumbs('CategoryID')).toEqual([]);
      });
      it('should return a single crumb if no parentID', () => {
        component.categories = { Items: [{ ID: 'CategoryID' }] };
        expect(component.buildBreadCrumbs('CategoryID')).toEqual([
          { ID: 'CategoryID' },
        ]);
      });
      it('should build a long list of crumbs in correct order', () => {
        component.categories = {
          Items: [
            { ID: 'a', ParentID: 'b' },
            { ID: 'b', ParentID: 'c' },
            { ID: 'c' },
            { ID: 'd' },
          ],
        };
        expect(component.buildBreadCrumbs('a')).toEqual([
          { ID: 'c' },
          { ID: 'b', ParentID: 'c' },
          { ID: 'a', ParentID: 'b' },
        ]);
      });
    });

    describe('toProductDetails', () => {
      const product = { ID: 'mockProductID' };
      it('should navigate to product detail with product.ID as ID query param', () => {
        const navigateSpy = spyOn((<any>component).router, 'navigate');
        component.toProductDetails(product);
        expect(navigateSpy).toHaveBeenCalledWith(['/products/detail'], {
          queryParams: { ID: product.ID },
        });
      });
    });

    describe('addToCart', () => {
      const mockEvent = { product: { ID: 'MockProduct' }, quantity: 3 };
      beforeEach(() => {
        component.addToCart(mockEvent);
      });
      it('should call ocLineItemService.Create', () => {
        expect(ocLineItemService.create).toHaveBeenCalledWith(
          mockEvent.product,
          mockEvent.quantity
        );
      });
    });
  });
});
