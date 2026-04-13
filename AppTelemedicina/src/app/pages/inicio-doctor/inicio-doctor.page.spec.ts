import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InicioDoctorPage } from './inicio-doctor.page';

describe('InicioDoctorPage', () => {
  let component: InicioDoctorPage;
  let fixture: ComponentFixture<InicioDoctorPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(InicioDoctorPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
