import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalisisDoctorPage } from './analisis-doctor.page';

describe('AnalisisDoctorPage', () => {
  let component: AnalisisDoctorPage;
  let fixture: ComponentFixture<AnalisisDoctorPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AnalisisDoctorPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
