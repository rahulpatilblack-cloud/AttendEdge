import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AddEmployeeForm from '@/components/AddEmployeeForm';
import EmployeeList from '@/components/EmployeeList';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ProjectTeamManagement = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleAddSuccess = () => {
    setShowAddForm(false);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleAddConsultant = () => {
    setShowAddForm(true);
  };

  const handleCancel = () => {
    setShowAddForm(false);
  };

  if (showAddForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-bold">Add New Consultant</h1>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle>Consultant Information</CardTitle>
          </CardHeader>
          <CardContent>
            <AddEmployeeForm onSuccess={handleAddSuccess} onCancel={handleCancel} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <EmployeeList
      onAddEmployee={handleAddConsultant}
      refreshTrigger={refreshTrigger}
      title="Consultants"
      emptyTitle="No consultants found"
      emptySubtitle="Get started by adding your first consultant"
      addButtonLabel="Add Consultant"
    />
  );
};

export default ProjectTeamManagement;
