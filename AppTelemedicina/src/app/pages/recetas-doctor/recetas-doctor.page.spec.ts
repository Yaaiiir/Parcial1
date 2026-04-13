import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RecetasDoctorPage } from './recetas-doctor.page';

describe('RecetasDoctorPage', () => {
  let component: RecetasDoctorPage;
  let fixture: ComponentFixture<RecetasDoctorPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RecetasDoctorPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
