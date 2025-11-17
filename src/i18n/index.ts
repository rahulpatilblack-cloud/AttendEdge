import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// English translations
const en = {
  translation: {
    // Navigation
    dashboard: 'Dashboard',
    attendance: 'Attendance',
    leaveRequests: 'Leave Requests',
    holidays: 'Holidays',
    manageLeaveRequests: 'Manage Leave Requests',
    employeeManagement: 'Employee Management',
    reportsAnalytics: 'Reports & Analytics',
    systemSettings: 'System Settings',
    profile: 'Profile',
    
    // Common
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    add: 'Add',
    search: 'Search',
    filter: 'Filter',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    confirm: 'Confirm',
    back: 'Back',
    
    // Settings
    colorTheme: 'Color Theme',
    fontFamily: 'Font Family',
    fontSize: 'Font Size',
    sidebarPosition: 'Sidebar Position',
    componentShape: 'Component Shape',
    layoutDensity: 'Layout Density',
    reducedMotion: 'Reduced Motion',
    accentColor: 'Accent Color',
    notificationPreferences: 'Notification Preferences',
    language: 'Language',
    lateMarkTime: 'Late Mark Allowed Time',
    
    // Settings descriptions
    colorThemeDesc: 'Choose your preferred color theme. This will affect the entire app UI.',
    fontFamilyDesc: 'Choose your preferred font style for the app.',
    fontSizeDesc: 'Adjust the base font size for better readability.',
    sidebarPositionDesc: 'Choose where the sidebar appears on the screen.',
    componentShapeDesc: 'Choose the corner style for buttons, cards, and other components.',
    layoutDensityDesc: 'Choose the spacing density of the interface.',
    reducedMotionDesc: 'Disable animations for better accessibility.',
    accentColorDesc: 'Choose your preferred accent color for buttons and highlights.',
    notificationPreferencesDesc: 'Choose how you want to receive notifications.',
    languageDesc: 'Choose your preferred language for the interface.',
    lateMarkTimeDesc: 'Check-ins after this time are considered late. (24h format, e.g., 09:30)',
    
    // Notification types
    toastNotifications: 'Toast Notifications',
    soundAlerts: 'Sound Alerts',
    emailNotifications: 'Email Notifications',
    toastNotificationsDesc: 'Show pop-up notifications',
    soundAlertsDesc: 'Play notification sounds',
    emailNotificationsDesc: 'Send email alerts',
    
    // Status
    enabled: 'Enabled',
    disabled: 'Disabled',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    
    // Actions
    checkIn: 'Check In',
    checkOut: 'Check Out',
    submit: 'Submit',
    approve: 'Approve',
    reject: 'Reject',
    
    // Time
    today: 'Today',
    yesterday: 'Yesterday',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    
    // Welcome messages
    welcomeBack: 'Welcome back',
    goodMorning: 'Good Morning',
    goodAfternoon: 'Good Afternoon',
    goodEvening: 'Good Evening',
    
    // Roles
    superAdmin: 'Super Admin',
    admin: 'Admin',
    manager: 'Manager',
    employee: 'Employee',
    
    // Access denied
    accessDenied: 'Access Denied',
    accessDeniedDesc: "You don't have permission to access this section",
    
    // System messages
    managementSystem: 'Management System',
  }
};

// Spanish translations
const es = {
  translation: {
    // Navigation
    dashboard: 'Panel de Control',
    attendance: 'Asistencia',
    leaveRequests: 'Solicitudes de Permiso',
    holidays: 'Festivos',
    manageLeaveRequests: 'Gestionar Solicitudes',
    employeeManagement: 'Gestión de Empleados',
    reportsAnalytics: 'Informes y Análisis',
    systemSettings: 'Configuración del Sistema',
    profile: 'Perfil',
    
    // Common
    save: 'Guardar',
    cancel: 'Cancelar',
    edit: 'Editar',
    delete: 'Eliminar',
    add: 'Agregar',
    search: 'Buscar',
    filter: 'Filtrar',
    loading: 'Cargando...',
    error: 'Error',
    success: 'Éxito',
    confirm: 'Confirmar',
    back: 'Atrás',
    
    // Settings
    colorTheme: 'Tema de Color',
    fontFamily: 'Familia de Fuente',
    fontSize: 'Tamaño de Fuente',
    sidebarPosition: 'Posición de la Barra Lateral',
    componentShape: 'Forma del Componente',
    layoutDensity: 'Densidad del Diseño',
    reducedMotion: 'Movimiento Reducido',
    accentColor: 'Color de Acento',
    notificationPreferences: 'Preferencias de Notificación',
    language: 'Idioma',
    lateMarkTime: 'Hora Permitida de Llegada Tardía',
    
    // Settings descriptions
    colorThemeDesc: 'Elige tu tema de color preferido. Esto afectará toda la interfaz de la aplicación.',
    fontFamilyDesc: 'Elige tu estilo de fuente preferido para la aplicación.',
    fontSizeDesc: 'Ajusta el tamaño de fuente base para mejor legibilidad.',
    sidebarPositionDesc: 'Elige dónde aparece la barra lateral en la pantalla.',
    componentShapeDesc: 'Elige el estilo de esquina para botones, tarjetas y otros componentes.',
    layoutDensityDesc: 'Elige la densidad de espaciado de la interfaz.',
    reducedMotionDesc: 'Desactiva las animaciones para mejor accesibilidad.',
    accentColorDesc: 'Elige tu color de acento preferido para botones y destacados.',
    notificationPreferencesDesc: 'Elige cómo quieres recibir las notificaciones.',
    languageDesc: 'Elige tu idioma preferido para la interfaz.',
    lateMarkTimeDesc: 'Los registros después de esta hora se consideran tardíos. (formato 24h, ej., 09:30)',
    
    // Notification types
    toastNotifications: 'Notificaciones Toast',
    soundAlerts: 'Alertas de Sonido',
    emailNotifications: 'Notificaciones por Email',
    toastNotificationsDesc: 'Mostrar notificaciones emergentes',
    soundAlertsDesc: 'Reproducir sonidos de notificación',
    emailNotificationsDesc: 'Enviar alertas por email',
    
    // Status
    enabled: 'Habilitado',
    disabled: 'Deshabilitado',
    pending: 'Pendiente',
    approved: 'Aprobado',
    rejected: 'Rechazado',
    
    // Actions
    checkIn: 'Registrar Entrada',
    checkOut: 'Registrar Salida',
    submit: 'Enviar',
    approve: 'Aprobar',
    reject: 'Rechazar',
    
    // Time
    today: 'Hoy',
    yesterday: 'Ayer',
    thisWeek: 'Esta Semana',
    thisMonth: 'Este Mes',
    
    // Welcome messages
    welcomeBack: 'Bienvenido de vuelta',
    goodMorning: 'Buenos Días',
    goodAfternoon: 'Buenas Tardes',
    goodEvening: 'Buenas Noches',
    
    // Roles
    superAdmin: 'Super Administrador',
    admin: 'Administrador',
    manager: 'Gerente',
    employee: 'Empleado',
    
    // Access denied
    accessDenied: 'Acceso Denegado',
    accessDeniedDesc: 'No tienes permiso para acceder a esta sección',
    
    // System messages
    managementSystem: 'Sistema de Gestión',
  }
};

// French translations
const fr = {
  translation: {
    // Navigation
    dashboard: 'Tableau de Bord',
    attendance: 'Présence',
    leaveRequests: 'Demandes de Congé',
    holidays: 'Jours Fériés',
    manageLeaveRequests: 'Gérer les Demandes',
    employeeManagement: 'Gestion des Employés',
    reportsAnalytics: 'Rapports et Analyses',
    systemSettings: 'Paramètres Système',
    profile: 'Profil',
    
    // Common
    save: 'Enregistrer',
    cancel: 'Annuler',
    edit: 'Modifier',
    delete: 'Supprimer',
    add: 'Ajouter',
    search: 'Rechercher',
    filter: 'Filtrer',
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',
    confirm: 'Confirmer',
    back: 'Retour',
    
    // Settings
    colorTheme: 'Thème de Couleur',
    fontFamily: 'Famille de Police',
    fontSize: 'Taille de Police',
    sidebarPosition: 'Position de la Barre Latérale',
    componentShape: 'Forme du Composant',
    layoutDensity: 'Densité de la Disposition',
    reducedMotion: 'Mouvement Réduit',
    accentColor: 'Couleur d\'Accent',
    notificationPreferences: 'Préférences de Notification',
    language: 'Langue',
    lateMarkTime: 'Heure de Retard Autorisée',
    
    // Settings descriptions
    colorThemeDesc: 'Choisissez votre thème de couleur préféré. Cela affectera toute l\'interface de l\'application.',
    fontFamilyDesc: 'Choisissez votre style de police préféré pour l\'application.',
    fontSizeDesc: 'Ajustez la taille de police de base pour une meilleure lisibilité.',
    sidebarPositionDesc: 'Choisissez où la barre latérale apparaît à l\'écran.',
    componentShapeDesc: 'Choisissez le style de coin pour les boutons, cartes et autres composants.',
    layoutDensityDesc: 'Choisissez la densité d\'espacement de l\'interface.',
    reducedMotionDesc: 'Désactivez les animations pour une meilleure accessibilité.',
    accentColorDesc: 'Choisissez votre couleur d\'accent préférée pour les boutons et les surbrillances.',
    notificationPreferencesDesc: 'Choisissez comment vous voulez recevoir les notifications.',
    languageDesc: 'Choisissez votre langue préférée pour l\'interface.',
    lateMarkTimeDesc: 'Les enregistrements après cette heure sont considérés comme tardifs. (format 24h, ex., 09:30)',
    
    // Notification types
    toastNotifications: 'Notifications Toast',
    soundAlerts: 'Alertes Sonores',
    emailNotifications: 'Notifications par Email',
    toastNotificationsDesc: 'Afficher les notifications pop-up',
    soundAlertsDesc: 'Jouer les sons de notification',
    emailNotificationsDesc: 'Envoyer les alertes par email',
    
    // Status
    enabled: 'Activé',
    disabled: 'Désactivé',
    pending: 'En Attente',
    approved: 'Approuvé',
    rejected: 'Rejeté',
    
    // Actions
    checkIn: 'Pointer',
    checkOut: 'Dépointer',
    submit: 'Soumettre',
    approve: 'Approuver',
    reject: 'Rejeter',
    
    // Time
    today: 'Aujourd\'hui',
    yesterday: 'Hier',
    thisWeek: 'Cette Semaine',
    thisMonth: 'Ce Mois',
    
    // Welcome messages
    welcomeBack: 'Bon retour',
    goodMorning: 'Bonjour',
    goodAfternoon: 'Bon après-midi',
    goodEvening: 'Bonsoir',
    
    // Roles
    superAdmin: 'Super Administrateur',
    admin: 'Administrateur',
    manager: 'Gestionnaire',
    employee: 'Employé',
    
    // Access denied
    accessDenied: 'Accès Refusé',
    accessDeniedDesc: 'Vous n\'avez pas la permission d\'accéder à cette section',
    
    // System messages
    managementSystem: 'Système de Gestion',
  }
};

// Initialize i18n
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en,
      es,
      fr,
    },
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

export default i18n; 