import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PacientesDoctorPage } from './pacientes-doctor.page';

describe('PacientesDoctorPage', () => {
  let component: PacientesDoctorPage;
  let fixture: ComponentFixture<PacientesDoctorPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PacientesDoctorPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
